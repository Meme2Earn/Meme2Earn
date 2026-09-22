// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DareEscrow is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FINALIZER_ROLE = keccak256("FINALIZER_ROLE");
    bytes32 public constant TOKEN_MANAGER_ROLE = keccak256("TOKEN_MANAGER_ROLE");

    uint64 public constant DEFAULT_REFUND_DELAY = 7 days;
    uint256 public constant CREATOR_FEE_BPS = 250;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    address public feeRecipient;

    enum FundingType {
        SelfFunded,
        CommunityFunded
    }

    enum WinnerSelection {
        CreatorDecides,
        CommunityDecides
    }

    enum EscrowStatus {
        None,
        Open,
        Funded,
        Finalized,
        Cancelled
    }

    struct Escrow {
        address creator;
        IERC20 token;
        uint256 targetAmount;
        uint256 fundedAmount;
        uint64 deadline;
        uint64 refundDelay;
        FundingType fundingType;
        WinnerSelection winnerSelection;
        EscrowStatus status;
        address winner;
    }

    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => mapping(address => uint256)) public contributions;
    mapping(address => bool) public supportedTokens;

    event SupportedTokenSet(address indexed token, bool supported);
    event EscrowCreated(
        bytes32 indexed bountyId,
        address indexed creator,
        address indexed token,
        uint256 targetAmount,
        uint64 deadline,
        FundingType fundingType,
        WinnerSelection winnerSelection
    );
    event Funded(bytes32 indexed bountyId, address indexed funder, uint256 amount, uint256 fundedAmount);
    event Finalized(bytes32 indexed bountyId, address indexed winner, uint256 payoutAmount);
    event Cancelled(bytes32 indexed bountyId);
    event Refunded(bytes32 indexed bountyId, address indexed funder, uint256 amount);
    event FeeRecipientSet(address indexed feeRecipient);
    event CreatorFeePaid(bytes32 indexed bountyId, address indexed payer, address indexed feeRecipient, uint256 amount);

    error InvalidBountyId();
    error InvalidToken();
    error InvalidAmount();
    error InvalidDeadline();
    error EscrowAlreadyExists();
    error EscrowNotFound();
    error EscrowNotOpen();
    error EscrowNotFunded();
    error EscrowAlreadyFunded();
    error SelfFundedMustDepositTarget();
    error UnauthorizedFinalizer();
    error DeadlineNotReached();
    error RefundDelayNotReached();
    error NoRefundAvailable();
    error InvalidWinner();
    error InvalidFeeRecipient();
    error DeadlineReached();
    error EscrowNotCancellable();
    error UnsupportedTokenBehavior();

    constructor(address admin, address initialFeeRecipient) {
        address initialAdmin = admin == address(0) ? msg.sender : admin;
        address resolvedFeeRecipient = initialFeeRecipient == address(0) ? initialAdmin : initialFeeRecipient;
        if (resolvedFeeRecipient == address(0)) revert InvalidFeeRecipient();

        feeRecipient = resolvedFeeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(FINALIZER_ROLE, initialAdmin);
        _grantRole(TOKEN_MANAGER_ROLE, initialAdmin);

        emit FeeRecipientSet(resolvedFeeRecipient);
    }

    function setSupportedToken(address token, bool supported) external onlyRole(TOKEN_MANAGER_ROLE) {
        if (token == address(0)) revert InvalidToken();
        supportedTokens[token] = supported;
        emit SupportedTokenSet(token, supported);
    }

    function setFeeRecipient(address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeRecipient == address(0)) revert InvalidFeeRecipient();
        feeRecipient = newFeeRecipient;
        emit FeeRecipientSet(newFeeRecipient);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function createEscrow(
        bytes32 clientBountyId,
        address token,
        uint256 targetAmount,
        uint64 deadline,
        FundingType fundingType,
        WinnerSelection winnerSelection,
        uint256 initialAmount
    ) external nonReentrant whenNotPaused {
        if (clientBountyId == bytes32(0)) revert InvalidBountyId();
        bytes32 bountyId = escrowId(msg.sender, clientBountyId);
        if (escrows[bountyId].status != EscrowStatus.None) revert EscrowAlreadyExists();
        if (!supportedTokens[token]) revert InvalidToken();
        if (targetAmount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        if (fundingType == FundingType.SelfFunded && initialAmount != targetAmount) {
            revert SelfFundedMustDepositTarget();
        }

        Escrow storage escrow = escrows[bountyId];
        escrow.creator = msg.sender;
        escrow.token = IERC20(token);
        escrow.targetAmount = targetAmount;
        escrow.deadline = deadline;
        escrow.refundDelay = DEFAULT_REFUND_DELAY;
        escrow.fundingType = fundingType;
        escrow.winnerSelection = winnerSelection;
        escrow.status = EscrowStatus.Open;

        emit EscrowCreated(bountyId, msg.sender, token, targetAmount, deadline, fundingType, winnerSelection);

        if (fundingType == FundingType.SelfFunded) {
            uint256 creatorFee = _creatorFee(targetAmount);
            if (creatorFee > 0) {
                if (msg.sender != feeRecipient) {
                    uint256 feeBalanceBefore = IERC20(token).balanceOf(feeRecipient);
                    IERC20(token).safeTransferFrom(msg.sender, feeRecipient, creatorFee);
                    if (IERC20(token).balanceOf(feeRecipient) - feeBalanceBefore != creatorFee) {
                        revert UnsupportedTokenBehavior();
                    }
                }
                emit CreatorFeePaid(bountyId, msg.sender, feeRecipient, creatorFee);
            }
        }

        if (initialAmount > 0) {
            _fund(bountyId, msg.sender, initialAmount);
        }
    }

    function fund(bytes32 bountyId, uint256 amount) external nonReentrant whenNotPaused {
        _fund(bountyId, msg.sender, amount);
    }

    function finalize(bytes32 bountyId, address winner) external nonReentrant whenNotPaused {
        Escrow storage escrow = _getEscrow(bountyId);
        if (escrow.status != EscrowStatus.Funded) revert EscrowNotFunded();
        if (winner == address(0)) revert InvalidWinner();

        if (escrow.winnerSelection == WinnerSelection.CreatorDecides) {
            if (msg.sender != escrow.creator) revert UnauthorizedFinalizer();
        } else {
            if (block.timestamp < escrow.deadline) revert DeadlineNotReached();
            if (!hasRole(FINALIZER_ROLE, msg.sender)) revert UnauthorizedFinalizer();
        }

        uint256 payoutAmount = escrow.fundedAmount;
        escrow.fundedAmount = 0;
        escrow.winner = winner;
        escrow.status = EscrowStatus.Finalized;

        escrow.token.safeTransfer(winner, payoutAmount);
        emit Finalized(bountyId, winner, payoutAmount);
    }

    function cancel(bytes32 bountyId) external nonReentrant {
        Escrow storage escrow = _getEscrow(bountyId);
        if (escrow.status != EscrowStatus.Open && escrow.status != EscrowStatus.Funded) {
            revert EscrowNotCancellable();
        }
        if (msg.sender != escrow.creator && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedFinalizer();
        }
        if (block.timestamp >= escrow.deadline) revert DeadlineReached();

        escrow.status = EscrowStatus.Cancelled;
        emit Cancelled(bountyId);
    }

    function cancelExpiredUnfinalized(bytes32 bountyId) external nonReentrant {
        Escrow storage escrow = _getEscrow(bountyId);
        if (escrow.status != EscrowStatus.Open && escrow.status != EscrowStatus.Funded) {
            revert EscrowNotCancellable();
        }
        if (block.timestamp < escrow.deadline + escrow.refundDelay) revert RefundDelayNotReached();

        escrow.status = EscrowStatus.Cancelled;
        emit Cancelled(bountyId);
    }

    function refund(bytes32 bountyId) external nonReentrant {
        Escrow storage escrow = _getEscrow(bountyId);
        if (escrow.status != EscrowStatus.Cancelled) revert NoRefundAvailable();

        uint256 amount = contributions[bountyId][msg.sender];
        if (amount == 0) revert NoRefundAvailable();

        contributions[bountyId][msg.sender] = 0;
        escrow.fundedAmount -= amount;

        escrow.token.safeTransfer(msg.sender, amount);
        emit Refunded(bountyId, msg.sender, amount);
    }

    function _fund(bytes32 bountyId, address funder, uint256 amount) private {
        Escrow storage escrow = _getEscrow(bountyId);
        if (escrow.status != EscrowStatus.Open) revert EscrowNotOpen();
        if (block.timestamp >= escrow.deadline) revert DeadlineReached();
        if (amount == 0) revert InvalidAmount();
        if (escrow.fundedAmount + amount > escrow.targetAmount) revert EscrowAlreadyFunded();

        uint256 escrowBalanceBefore = escrow.token.balanceOf(address(this));
        escrow.token.safeTransferFrom(funder, address(this), amount);
        if (escrow.token.balanceOf(address(this)) - escrowBalanceBefore != amount) {
            revert UnsupportedTokenBehavior();
        }

        contributions[bountyId][funder] += amount;
        escrow.fundedAmount += amount;

        if (escrow.fundedAmount == escrow.targetAmount) {
            escrow.status = EscrowStatus.Funded;
        }

        emit Funded(bountyId, funder, amount, escrow.fundedAmount);
    }

    function _getEscrow(bytes32 bountyId) private view returns (Escrow storage escrow) {
        escrow = escrows[bountyId];
        if (escrow.status == EscrowStatus.None) revert EscrowNotFound();
    }

    function _creatorFee(uint256 amount) private pure returns (uint256) {
        return (amount * CREATOR_FEE_BPS) / BPS_DENOMINATOR;
    }

    function escrowId(address creator, bytes32 clientBountyId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(creator, clientBountyId));
    }
}
