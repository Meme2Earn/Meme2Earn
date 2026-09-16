import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Clock3,
  Compass,
  Copy,
  LayoutDashboard,
  Plus,
  Search,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  createBountyRecord,
  createSubmissionRecord,
  fetchBounties,
  fetchBountyJoins,
  finalizeCommunityWinnerRecord,
  fetchSubmissionVotes,
  fetchSubmissions,
  isSecureProfileStorageConfigured,
  isSupabaseConfigured,
  joinBountyRecord,
  saveProfileRecord,
  saveProfileWithPrivy,
  selectCreatorWinnerRecord,
  uploadSubmissionVideo,
  voteSubmissionRecord,
} from "./supabaseStorage.js";
import {
  createBountyEscrow,
  DARE_ESCROW_ADDRESS,
  finalizeBountyEscrow,
  fundBountyEscrow,
} from "./escrowClient.js";

const CATEGORY_COLORS = {
  "Meme Template": "#FF3EA0",
  "Edit / Remix": "#FF3EA0",
  "Original Art": "#FF3EA0",
  "Video / Animation": "#FF3EA0",
  "Copy / Shitpost": "#FF3EA0",
};

const TABS = ["Open", "In Progress", "Completed", "All"];
const PAGES = ["Explore", "M2E TV", "Create", "Profile"];
const AUTH_ONLY_PAGES = ["Terms", "SetupProfile", "Profile"];
const TOKEN_METADATA = {
  USDG: {
    contract: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    logo: "/tokens/usdg.png",
  },
  PONS: {
    contract: "0x39dBED3a2bd333467115dE45665cC57F813C4571",
    logo: "/tokens/pons.png",
  },
  CASHCAT: {
    contract: "0x020bfC650A365f8BB26819deAAbF3E21291018b4",
    logo: "/tokens/cashcat.png",
  },
  ARTIFICIAL_INU: {
    contract: "0x2E8c31162b855A2ffa90F6F8634643Ad6F111e18",
    logo: "/tokens/artificial-inu.png",
  },
  NVDA: {
    contract: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
    logo: "/tokens/nvda.ico",
  },
  AAPL: {
    contract: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
    logo: "/tokens/aapl.png",
  },
  MSFT: {
    contract: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
    logo: "/tokens/msft.ico",
  },
};
const TOKEN_CONTRACTS = Object.fromEntries(
  Object.entries(TOKEN_METADATA).map(([token, metadata]) => [token, metadata.contract]),
);
const TOKEN_OPTIONS = Object.keys(TOKEN_METADATA);
const CONTAINED_LOGO_TOKENS = new Set(["USDG", "AAPL", "MSFT"]);
const FUNDING_TYPES = [
  {
    value: "Self-Funded Dare",
    description: "You fund the dare yourself.",
  },
  {
    value: "Community-Funded Dare",
    description: "The community funds it.",
  },
];
const WINNER_SELECTION_OPTIONS = ["Community decides", "Creator decides"];

const seedBounties = [
  {
    id: 1,
    title: "Make our launch chart look legally unstoppable",
    description:
      "Create a shareable template using our token chart, mascot, and a clean caption area. Needs to work on X and Telegram without tiny text.",
    category: "Meme Template",
    reward: 6800000,
    coin: "USDG",
    deadline: "2026-09-18",
    daysLeft: 4,
    applicants: 8,
    maxApplicants: 20,
    status: "Open",
    poster: "0x72A8fB4c2E1d7A90a31d93C84E9C8b61B1E02F44",
  },
  {
    id: 2,
    title: "Remix the founder photo into a clean reaction pack",
    description:
      "Turn three founder screenshots into five reusable reaction images. Keep it sharp, readable, and easy to caption later.",
    category: "Edit / Remix",
    reward: 1250000,
    coin: "PONS",
    deadline: "2026-09-16",
    daysLeft: 2,
    applicants: 12,
    maxApplicants: 12,
    status: "In Progress",
    poster: "0xB241e5f6dD3B6f02c903281fC09362e515D7A0A7",
  },
  {
    id: 3,
    title: "Draw the coin mascot as a tiny market maker",
    description:
      "Original square artwork for profile posts and community stickers. Include one transparent-background export concept.",
    category: "Original Art",
    reward: 45000000,
    coin: "CASHCAT",
    deadline: "2026-09-24",
    daysLeft: 10,
    applicants: 3,
    maxApplicants: 8,
    status: "Open",
    poster: "0x4bbC49EcfB6B8e9dcE78929d8097D03A561617B0",
  },
  {
    id: 4,
    title: "Animate a five-second supply shock loop",
    description:
      "Short vertical animation for reels. The concept should show scarce supply, fast demand, and the token name without clutter.",
    category: "Video / Animation",
    reward: 9600000,
    coin: "ARTIFICIAL_INU",
    deadline: "2026-09-21",
    daysLeft: 7,
    applicants: 5,
    maxApplicants: 10,
    status: "Open",
    poster: "0xE138b97EFA793747cC6fF6db77D3B5820aE79971",
  },
  {
    id: 5,
    title: "Write twenty short posts for the next listing push",
    description:
      "Plain, punchy social copy for X. Avoid inside jokes that need too much context. Include five replies for comment threads.",
    category: "Copy / Shitpost",
    reward: 78000000,
    coin: "NVDA",
    deadline: "2026-09-15",
    daysLeft: 1,
    applicants: 18,
    maxApplicants: 25,
    status: "In Progress",
    poster: "0x2f2a69589c0Bcc7E7Da475721C5B49234D10f53B",
  },
  {
    id: 6,
    title: "Design a victory meme for completed holders",
    description:
      "One polished image for celebrating holders who finished the campaign. Use a clean composition and leave room for numbers.",
    category: "Meme Template",
    reward: 1500000,
    coin: "AAPL",
    deadline: "2026-09-10",
    daysLeft: 0,
    applicants: 15,
    maxApplicants: 15,
    status: "Completed",
    poster: "0x81689e3c6a5Ff249BaEC0c89a42F062BC7d7a57B",
  },
];

const blankForm = {
  title: "",
  description: "",
  image: "",
  fundingType: "Self-Funded Dare",
  winnerSelection: "Community decides",
  category: "Meme Template",
  reward: "",
  coin: "USDG",
  maxApplicants: 10,
  deadline: "",
};

const blankProfile = {
  username: "",
  avatar: "",
};

const X_ACCOUNT_TYPES = ["twitter", "twitter_oauth", "x"];

const profileTerms = [
  "By setting a profile, you confirm that the username and profile picture you provide are owned by you, licensed to you, or otherwise lawful for you to use on meme2earn.",
  "You are responsible for all content, submissions, messages, bounty posts, claims, links, profile information, and other activity associated with your account or connected identity.",
  "meme2earn is a client-side bounty interface and does not guarantee that any bounty will be funded, completed, accepted, judged, paid, settled, or remain available.",
  "Rewards, coin tickers, balances, bounty values, deadlines, applicant counts, and other market or bounty data may be inaccurate, delayed, simulated, user-generated, or subject to change.",
  "You agree not to upload or submit unlawful, infringing, abusive, deceptive, malicious, private, sexually exploitative, hateful, harassing, or otherwise harmful content.",
  "You agree not to impersonate another person or organization, misrepresent your affiliation, manipulate bounty participation, spam the platform, or interfere with other users.",
  "You understand that meme coins and crypto assets can be volatile, illiquid, experimental, and risky. Nothing in meme2earn is financial, investment, legal, tax, or professional advice.",
  "You are solely responsible for reviewing wallet prompts, transactions, permissions, token contracts, tax obligations, and any off-platform agreements before taking action.",
  "To the maximum extent permitted by applicable law, meme2earn and its creators, operators, contributors, and affiliates are not liable for lost funds, lost rewards, missed deadlines, rejected submissions, profile misuse, data loss, market movement, third-party actions, wallet issues, smart-contract issues, or indirect, incidental, special, consequential, punitive, or exemplary damages.",
  "The platform is provided as is and as available, without warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, security, uninterrupted operation, or error-free performance.",
  "meme2earn may moderate, hide, remove, restrict, or refuse content or accounts at any time if content appears unsafe, unlawful, infringing, deceptive, abusive, spammy, or otherwise unsuitable for the platform.",
  "These terms are a product disclaimer and usage acknowledgement for this prototype. They are not a substitute for legal advice and should be reviewed by qualified counsel before production use.",
];

function formatReward(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function truncateAddress(address) {
  if (!address) return "Wallet pending";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTokenAddress(token) {
  return TOKEN_CONTRACTS[token] || "";
}

function getTokenLogoUrl(token) {
  return TOKEN_METADATA[token]?.logo || "";
}

function getDaysLeft(dateValue) {
  if (!dateValue) return 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${dateValue}T00:00:00`);
  return Math.max(0, Math.ceil((deadline - today) / 86400000));
}

function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function readStoredAccount(key) {
  if (!key) return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeStoredAccount(key, patch) {
  if (!key) return;
  const current = readStoredAccount(key);
  window.localStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
}

function findXAccount(user) {
  const accounts = [user?.twitter, user?.x, ...(user?.linkedAccounts || [])].filter(Boolean);
  return accounts.find((account) => {
    const type = String(account.type || account.provider || account.chainType || "").toLowerCase();
    return X_ACCOUNT_TYPES.some((accountType) => type.includes(accountType)) || account.username || account.screenName;
  });
}

function getXProfile(user) {
  const account = findXAccount(user);
  if (!account) return null;

  const username = firstValue(
    account.username,
    account.screenName,
    account.handle,
    account.name,
    account.displayName,
  ).replace(/^@/, "");
  const avatar = firstValue(
    account.profilePictureUrl,
    account.profilePicture,
    account.profileImageUrl,
    account.avatarUrl,
    account.picture,
    account.imageUrl,
  );

  if (!username && !avatar) return null;
  return { avatar, username };
}

function App({ auth }) {
  const [page, setPage] = useState("Landing");
  const {
    ready = true,
    authenticated = false,
    getAccessToken = async () => "",
    login = () => {},
    logout = () => {},
    user = null,
    wallets = [],
  } = auth || {};
  const connected = ready && authenticated;
  const [activeTab, setActiveTab] = useState("Open");
  const [query, setQuery] = useState("");
  const [bounties, setBounties] = useState(seedBounties);
  const [selectedBountyId, setSelectedBountyId] = useState(null);
  const [joinedIds, setJoinedIds] = useState([]);
  const [joiningBountyIds, setJoiningBountyIds] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [submissionVotes, setSubmissionVotes] = useState({});
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [bountySyncStatus, setBountySyncStatus] = useState("");
  const [marketStatus, setMarketStatus] = useState("");
  const [profile, setProfile] = useState(blankProfile);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [xProfilePrefilled, setXProfilePrefilled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);

  const walletAddress = wallets?.find((wallet) => wallet.address)?.address || "";
  const selectedWallet = wallets?.find((wallet) => wallet.address === walletAddress) || wallets?.[0] || null;
  const userStorageId = user?.id || user?.did || walletAddress;
  const userStorageKey = userStorageId ? `meme2earn:onboarding:${userStorageId}` : "";

  useEffect(() => {
    let cancelled = false;

    async function loadBounties() {
      if (!isSupabaseConfigured) {
        setBountySyncStatus("Demo campaigns are loaded locally until Supabase is configured.");
        return;
      }

      setBountySyncStatus("Loading dare campaigns...");
      try {
        const result = await fetchBounties();
        if (cancelled) return;
        if (result.bounties.length > 0) {
          setBounties(result.bounties);
        }
        setBountySyncStatus(result.bounties.length > 0 ? "" : "No saved campaigns yet. Showing demo campaigns.");
      } catch (error) {
        if (cancelled) return;
        setBountySyncStatus(error.message || "Could not load saved campaigns. Showing demo campaigns.");
      }
    }

    loadBounties();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissionVotes() {
      if (!walletAddress || !isSupabaseConfigured) {
        setSubmissionVotes({});
        return;
      }

      try {
        const result = await fetchSubmissionVotes(walletAddress);
        if (!cancelled && result.stored) {
          setSubmissionVotes(result.votes);
        }
      } catch (error) {
        if (!cancelled) setMarketStatus(error.message || "Could not load submission votes.");
      }
    }

    loadSubmissionVotes();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplaceActivity() {
      if (!isSupabaseConfigured) return;

      try {
        const submissionsResult = await fetchSubmissions();
        if (!cancelled && submissionsResult.stored) {
          setSubmissions(submissionsResult.submissions);
        }
      } catch (error) {
        if (!cancelled) setMarketStatus(error.message || "Could not load submissions.");
      }
    }

    loadMarketplaceActivity();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadJoinedBounties() {
      if (!walletAddress || !isSupabaseConfigured) {
        setJoinedIds([]);
        return;
      }

      try {
        const result = await fetchBountyJoins(walletAddress);
        if (!cancelled && result.stored) {
          setJoinedIds(result.joins.map((join) => join.bountyId));
        }
      } catch (error) {
        if (!cancelled) setMarketStatus(error.message || "Could not load joined bounties.");
      }
    }

    loadJoinedBounties();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      setAccountLoaded(true);
      setTermsAccepted(false);
      setProfileComplete(false);
      setXProfilePrefilled(false);
      if (AUTH_ONLY_PAGES.includes(page)) setPage("Landing");
      return;
    }

    if (!userStorageKey) {
      setAccountLoaded(false);
      return;
    }

    const stored = readStoredAccount(userStorageKey);
    setTermsAccepted(Boolean(stored.termsAccepted));
    setProfileComplete(Boolean(stored.profileComplete));
    if (stored.profile) {
      setProfile((current) => ({ ...current, ...stored.profile }));
    }
    setAccountLoaded(true);
  }, [authenticated, ready, userStorageKey]);

  useEffect(() => {
    if (!ready || authenticated) return;
    if (AUTH_ONLY_PAGES.includes(page)) {
      setPage("Landing");
    }
  }, [authenticated, page, ready]);

  useEffect(() => {
    if (!ready || !authenticated || !accountLoaded || profileComplete) return;
    if (!termsAccepted && page !== "Terms") {
      setPage("Terms");
      return;
    }
    if (termsAccepted && page === "Terms") {
      setPage("SetupProfile");
    }
  }, [accountLoaded, authenticated, page, profileComplete, ready, termsAccepted]);

  const xProfile = useMemo(() => (authenticated ? getXProfile(user) : null), [authenticated, user]);
  const effectiveProfile = useMemo(
    () => ({
      username: xProfile?.username || profile.username || "",
      avatar: xProfile?.avatar || profile.avatar || "",
    }),
    [profile.avatar, profile.username, xProfile],
  );

  useEffect(() => {
    if (!ready || !authenticated || xProfilePrefilled) return;
    const xProfile = getXProfile(user);
    if (!xProfile) return;

    setProfile((current) => {
      const nextProfile = {
        username: xProfile.username || current.username,
        avatar: xProfile.avatar || current.avatar,
      };

      if (userStorageKey && (nextProfile.username !== current.username || nextProfile.avatar !== current.avatar)) {
        writeStoredAccount(userStorageKey, { profile: nextProfile });
      }

      return nextProfile;
    });
    setXProfilePrefilled(true);

    if (xProfile.username || xProfile.avatar) {
      setProfileStatus("Profile details were filled from X. You can edit them before saving.");
    }
  }, [authenticated, ready, user, userStorageKey, xProfilePrefilled]);

  const filteredBounties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bounties.filter((bounty) => {
      const matchesTab = activeTab === "All" || bounty.status === activeTab;
      const searchable = `${bounty.title} ${bounty.description} ${bounty.category} ${bounty.coin}`.toLowerCase();
      return matchesTab && searchable.includes(normalizedQuery);
    });
  }, [activeTab, bounties, query]);

  const stats = useMemo(
    () => ({
      open: bounties.filter((bounty) => bounty.status === "Open").length,
      coins: new Set(bounties.map((bounty) => bounty.coin)).size,
      hunters: bounties.reduce((sum, bounty) => sum + bounty.applicants, 0),
    }),
    [bounties],
  );

  const postedBounties = useMemo(
    () => (walletAddress ? bounties.filter((bounty) => bounty.poster === walletAddress) : []),
    [bounties, walletAddress],
  );

  const joinedBounties = useMemo(
    () => bounties.filter((bounty) => joinedIds.includes(bounty.id)),
    [bounties, joinedIds],
  );

  const selectedBounty = useMemo(
    () => bounties.find((bounty) => bounty.id === selectedBountyId),
    [bounties, selectedBountyId],
  );

  const videoFeedItems = useMemo(() => {
    return Object.values(submissions)
      .flat()
      .filter((submission) => submission.videoUrl)
      .map((submission) => ({
        submission,
        bounty: bounties.find((bounty) => String(bounty.id) === String(submission.bountyId)),
      }))
      .filter((item) => item.bounty)
      .sort((a, b) => {
        const aTime = Date.parse(a.submission.createdAt) || 0;
        const bTime = Date.parse(b.submission.createdAt) || 0;
        return bTime - aTime;
      });
  }, [bounties, submissions]);

  async function handleJoin(id) {
    if (!connected) {
      handleLoginClick();
      return;
    }

    if (!walletAddress) {
      setMarketStatus("Your wallet is still being created. Try again in a moment.");
      return;
    }

    if (joinedIds.includes(id)) return;
    if (joiningBountyIds.includes(id)) return;

    const targetBounty = bounties.find((bounty) => bounty.id === id);
    if (!targetBounty || targetBounty.applicants >= targetBounty.maxApplicants) return;

    setJoiningBountyIds((current) => (current.includes(id) ? current : [...current, id]));

    if (isSupabaseConfigured) {
      try {
        setMarketStatus("");
        const result = await joinBountyRecord({
          bountyId: id,
          getAccessToken,
          walletAddress,
          profile: effectiveProfile,
        });

        if (result.bounty) {
          setBounties((current) => current.map((bounty) => (bounty.id === id ? result.bounty : bounty)));
        }
        setJoinedIds((current) => (current.includes(id) ? current : [...current, id]));
        setMarketStatus("");
        setJoiningBountyIds((current) => current.filter((bountyId) => bountyId !== id));
        return;
      } catch (error) {
        setMarketStatus(error.message || "Could not join bounty.");
        setJoiningBountyIds((current) => current.filter((bountyId) => bountyId !== id));
        return;
      }
    }

    setBounties((current) =>
      current.map((bounty) => {
        if (bounty.id !== id || bounty.applicants >= bounty.maxApplicants || joinedIds.includes(id)) {
          return bounty;
        }

        return {
          ...bounty,
          applicants: bounty.applicants + 1,
        };
      }),
    );
    setJoinedIds((current) => (current.includes(id) ? current : [...current, id]));
    setMarketStatus("");
    setJoiningBountyIds((current) => current.filter((bountyId) => bountyId !== id));
  }

  async function handleDareSubmission(bountyId, submission) {
    if (!submission.videoFile) {
      setMarketStatus("Upload a video before submitting.");
      return;
    }

    if (!submission.videoFile.type.startsWith("video/")) {
      setMarketStatus("Upload a valid video file.");
      return;
    }

    const localVideoUrl = URL.createObjectURL(submission.videoFile);
    const nextSubmission = {
      id: String(Date.now()),
      bountyId: String(bountyId),
      walletAddress,
      author: effectiveProfile.username || truncateAddress(walletAddress),
      avatar: effectiveProfile.avatar,
      text: submission.note.trim(),
      videoName: submission.videoFile.name || "submission video",
      videoPath: "",
      videoType: submission.videoFile.type || "video/mp4",
      videoUrl: localVideoUrl,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      createdAt: "Just now",
    };

    if (isSupabaseConfigured) {
      try {
        setMarketStatus("Uploading video...");
        const uploadedVideo = await uploadSubmissionVideo({
          bountyId,
          file: submission.videoFile,
          walletAddress,
        });
        setMarketStatus("Saving submission...");
        const result = await createSubmissionRecord({
          bountyId,
          getAccessToken,
          submission: {
            ...nextSubmission,
            ...uploadedVideo,
          },
          walletAddress,
          profile: effectiveProfile,
        });
        URL.revokeObjectURL(localVideoUrl);
        setSubmissions((current) => ({
          ...current,
          [bountyId]: [result.submission, ...(current[bountyId] || [])],
        }));
        setMarketStatus("");
        return;
      } catch (error) {
        URL.revokeObjectURL(localVideoUrl);
        setMarketStatus(error.message || "Could not save submission.");
        return;
      }
    }

    setSubmissions((current) => ({
      ...current,
      [bountyId]: [nextSubmission, ...(current[bountyId] || [])],
    }));
    setMarketStatus("Submission saved locally. Configure Supabase to persist it.");
  }

  async function handleSubmissionVote({ bountyId, submissionId, vote }) {
    if (!connected) {
      handleLoginClick();
      return;
    }

    if (!walletAddress) {
      setMarketStatus("Your wallet is still being created. Try again in a moment.");
      return;
    }

    const currentVote = submissionVotes[submissionId] || 0;
    const nextVote = currentVote === vote ? 0 : vote;

    if (isSupabaseConfigured) {
      try {
        setMarketStatus("Saving vote...");
        const result = await voteSubmissionRecord({
          bountyId,
          getAccessToken,
          submissionId,
          vote: nextVote,
          walletAddress,
        });
        setSubmissions((current) => ({
          ...current,
          [bountyId]: (current[bountyId] || []).map((submission) =>
            submission.id === submissionId ? result.submission : submission,
          ),
        }));
        setSubmissionVotes((current) => {
          const next = { ...current };
          if (result.vote) next[submissionId] = result.vote;
          else delete next[submissionId];
          return next;
        });
        setMarketStatus("");
        return;
      } catch (error) {
        setMarketStatus(error.message || "Could not save vote.");
        return;
      }
    }

    setSubmissions((current) => ({
      ...current,
      [bountyId]: (current[bountyId] || []).map((submission) => {
        if (submission.id !== submissionId) return submission;
        const currentUpvotes = Number(submission.upvotes) || 0;
        const currentDownvotes = Number(submission.downvotes) || 0;
        const nextUpvotes = currentVote === 1 ? currentUpvotes - 1 : currentUpvotes + (nextVote === 1 ? 1 : 0);
        const nextDownvotes = currentVote === -1 ? currentDownvotes - 1 : currentDownvotes + (nextVote === -1 ? 1 : 0);
        return {
          ...submission,
          upvotes: nextUpvotes,
          downvotes: nextDownvotes,
          score: nextUpvotes - nextDownvotes,
        };
      }),
    }));
    setSubmissionVotes((current) => {
      const next = { ...current };
      if (nextVote) next[submissionId] = nextVote;
      else delete next[submissionId];
      return next;
    });
    setMarketStatus("Vote saved locally. Configure Supabase to persist it.");
  }

  async function handleFundBounty({ amount, bountyId }) {
    if (!connected) {
      handleLoginClick();
      return;
    }

    if (!selectedWallet || !walletAddress) {
      setMarketStatus("Your wallet is still being created. Try again in a moment.");
      return;
    }

    const targetBounty = bounties.find((bounty) => bounty.id === bountyId);
    const fundAmount = Number(amount);
    if (!targetBounty) return;
    if (targetBounty.fundingType !== "Community-Funded Dare") {
      setMarketStatus("Only community-funded dares can receive community funding.");
      return;
    }
    if (!fundAmount || fundAmount <= 0) {
      setMarketStatus("Enter a funding amount greater than 0.");
      return;
    }

    try {
      setMarketStatus("Approving funding transfer...");
      const result = await fundBountyEscrow({ amount, bounty: targetBounty, wallet: selectedWallet });
      setBounties((current) =>
        current.map((bounty) =>
          bounty.id === bountyId
            ? {
                ...bounty,
                escrowFundTxHash: result.escrowFundTxHash,
                escrowStatus: "Funding",
              }
            : bounty,
        ),
      );
      setMarketStatus("Funding transaction confirmed.");
    } catch (error) {
      setMarketStatus(error.message || "Could not fund this dare.");
    }
  }

  async function handleSelectCreatorWinner({ bountyId, submissionId }) {
    if (!connected) {
      handleLoginClick();
      return;
    }

    if (!walletAddress) {
      setMarketStatus("Your wallet is still being created. Try again in a moment.");
      return;
    }

    const targetBounty = bounties.find((bounty) => bounty.id === bountyId);
    const targetSubmission = (submissions[bountyId] || []).find((submission) => submission.id === submissionId);
    if (!targetBounty || !targetSubmission) return;

    if ((targetBounty.winnerSelection || "Community decides") !== "Creator decides") {
      setMarketStatus("This dare uses community winner selection.");
      return;
    }

    if (targetBounty.poster?.toLowerCase() !== walletAddress.toLowerCase()) {
      setMarketStatus("Only the creator can select a winner for this dare.");
      return;
    }

    let escrowFinalize = {};
    try {
      setMarketStatus("Releasing escrow to winner...");
      escrowFinalize = await finalizeBountyEscrow({
        bounty: targetBounty,
        wallet: selectedWallet,
        winner: targetSubmission.walletAddress,
      });
    } catch (error) {
      setMarketStatus(error.message || "Could not release escrow.");
      return;
    }

    if (isSupabaseConfigured) {
      try {
        setMarketStatus("Saving winner...");
        const result = await selectCreatorWinnerRecord({
          bountyId,
          escrowFinalizeTxHash: escrowFinalize.escrowFinalizeTxHash,
          getAccessToken,
          submissionId,
          walletAddress,
        });
        if (result.bounty) {
          setBounties((current) =>
            current.map((bounty) =>
              bounty.id === bountyId
                ? {
                    ...result.bounty,
                    ...escrowFinalize,
                    escrowStatus: "Finalized",
                  }
                : bounty,
            ),
          );
        }
        setMarketStatus("");
        return;
      } catch (error) {
        setMarketStatus(error.message || "Could not select winner.");
        return;
      }
    }

    setBounties((current) =>
      current.map((bounty) =>
        bounty.id === bountyId
          ? {
              ...bounty,
              status: "Completed",
              winnerSubmissionId: submissionId,
              winnerWalletAddress: targetSubmission.walletAddress,
              winnerSelectedAt: new Date().toISOString(),
              ...escrowFinalize,
              escrowStatus: "Finalized",
            }
          : bounty,
      ),
    );
    setMarketStatus("Winner selected locally. Configure Supabase to persist winner selection.");
  }

  async function handleFinalizeCommunityWinner(bountyId) {
    if (!connected) {
      handleLoginClick();
      return;
    }

    if (!walletAddress) {
      setMarketStatus("Your wallet is still being created. Try again in a moment.");
      return;
    }

    const targetBounty = bounties.find((bounty) => bounty.id === bountyId);
    if (!targetBounty) return;

    if ((targetBounty.winnerSelection || "Community decides") !== "Community decides") {
      setMarketStatus("This dare uses creator winner selection.");
      return;
    }

    if (targetBounty.status === "Completed") {
      setMarketStatus("This dare is already completed.");
      return;
    }

    try {
      setMarketStatus("Finalizing community winner...");
      const result = await finalizeCommunityWinnerRecord({
        bountyId,
        getAccessToken,
        walletAddress,
      });

      if (result.bounty) {
        setBounties((current) => current.map((bounty) => (bounty.id === bountyId ? result.bounty : bounty)));
      }
      setMarketStatus("");
    } catch (error) {
      setMarketStatus(error.message || "Could not finalize community winner.");
    }
  }

  function handleBountyImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((current) => ({
      ...current,
      image: URL.createObjectURL(file),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const reward = Number(form.reward);

    if (!connected) nextErrors.form = "Login to post a bounty.";
    if (connected && !walletAddress) nextErrors.form = "Your wallet is still being created. Try again in a moment.";
    if (connected && walletAddress && !selectedWallet) nextErrors.form = "Wallet provider is not ready. Try again in a moment.";
    if (!DARE_ESCROW_ADDRESS) nextErrors.form = "Escrow contract address is not configured.";
    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!reward || reward <= 0) nextErrors.reward = "Reward must be greater than 0.";
    if (!form.coin.trim()) nextErrors.coin = "Coin ticker is required.";

    setErrors(nextErrors);
    if (!connected) handleLoginClick();
    if (Object.keys(nextErrors).length > 0) return;

    const nextBounty = {
      id: String(Date.now()),
      title: form.title.trim(),
      description: form.description.trim() || "No description provided yet.",
      category: form.category,
      reward,
      coin: form.coin.trim().toUpperCase().replace(/^\$/, ""),
      deadline: form.deadline,
      daysLeft: getDaysLeft(form.deadline),
      applicants: 0,
      maxApplicants: Number(form.maxApplicants) || 1,
      status: "Open",
      poster: walletAddress,
      image: form.image,
      fundingType: form.fundingType,
      winnerSelection: form.winnerSelection,
      tokenAddress: getTokenAddress(form.coin),
    };

    try {
      setBountySyncStatus(
        nextBounty.fundingType === "Self-Funded Dare"
          ? "Approving and escrowing bounty funds..."
          : "Creating community funding escrow...",
      );
      const escrowResult = await createBountyEscrow({ bounty: nextBounty, wallet: selectedWallet });
      const bountyWithEscrow = {
        ...nextBounty,
        ...escrowResult,
      };

      setBountySyncStatus(isSupabaseConfigured ? "Saving dare campaign..." : "Saving campaign locally.");
      const result = await createBountyRecord({ bounty: bountyWithEscrow, getAccessToken });
      const savedBounty = result.bounty;
      setBounties((current) => [savedBounty, ...current]);
      setSelectedBountyId(savedBounty.id);
      setBountySyncStatus(result.stored ? "" : "Campaign saved locally. Configure Supabase to persist it.");
    } catch (error) {
      setErrors({ form: error.message || "Could not save campaign." });
      setBountySyncStatus("");
      return;
    }

    setActiveTab("Open");
    setForm(blankForm);
    setErrors({});
    setPage("BountyDetails");
  }

  async function handleSetProfile(event) {
    event.preventDefault();
    let nextProfile = effectiveProfile;
    setProfileStatus(
      isSecureProfileStorageConfigured || isSupabaseConfigured
        ? "Saving profile..."
        : "Profile saved locally for this session.",
    );
    try {
      if (isSecureProfileStorageConfigured) {
        const { avatarUrl } = await saveProfileWithPrivy({
          getAccessToken,
          profile: effectiveProfile,
          walletAddress,
        });
        nextProfile = { ...effectiveProfile, avatar: avatarUrl };
        setProfile(nextProfile);
        setProfileStatus("Profile saved.");
      } else {
        const { stored } = await saveProfileRecord({ walletAddress, profile: effectiveProfile });
        setProfileStatus(stored ? "Profile saved." : "Supabase is not configured yet. Profile saved locally.");
      }
    } catch (error) {
      setProfileStatus(error.message || "Could not save profile. Profile saved locally.");
    }
    writeStoredAccount(userStorageKey, { profile: nextProfile, profileComplete: true, termsAccepted: true });
    setProfileComplete(true);
    setPage("Profile");
  }

  function handleLoginClick() {
    if (!ready) return;
    login();
  }

  function handleHeaderAuthClick() {
    if (!ready) return;
    if (connected) {
      setPage("Profile");
      return;
    }
    login();
  }

  function handleLogoutClick() {
    logout();
    setPage("Landing");
  }

  function handleAcceptTerms() {
    writeStoredAccount(userStorageKey, { termsAccepted: true });
    setTermsAccepted(true);
    setPage("SetupProfile");
  }

  return (
    <div className="app-background min-h-screen bg-ink font-body text-text">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/88 backdrop-blur">
        <nav className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
          <button className="inline-flex items-center self-start" type="button" onClick={() => setPage("Landing")} aria-label="meme2earn home">
            <img className="h-10 w-auto" src="/favicon.svg" alt="" />
          </button>

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <div className="flex max-w-full overflow-x-auto border border-line bg-surface p-1">
              {PAGES.map((navPage) => (
                <button
                  key={navPage}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 px-3 text-sm font-bold transition ${
                    page === navPage ? "bg-pink text-ink" : "text-muted hover:bg-raised hover:text-text"
                  }`}
                  type="button"
                  onClick={() => setPage(navPage)}
                >
                  {navPage === "Explore" && <Compass size={16} />}
                  {navPage === "M2E TV" && <LayoutDashboard size={16} />}
                  {navPage === "Create" && <Plus size={16} />}
                  {navPage === "Profile" && <User size={16} />}
                  {navPage}
                </button>
              ))}
            </div>
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 border border-line bg-transparent px-4 text-sm font-medium text-text transition hover:border-pink hover:text-pink sm:w-auto"
              type="button"
              onClick={handleHeaderAuthClick}
            >
              <User size={17} />
              {connected ? truncateAddress(walletAddress) : "Login"}
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        {page === "Landing" && (
          <LandingPage
            bounties={bounties}
            stats={stats}
            onCreate={() => setPage("Create")}
            onExplore={() => setPage("Explore")}
          />
        )}

        {page === "Explore" && (
          <ExplorePage
            activeTab={activeTab}
            bounties={filteredBounties}
            bountySyncStatus={bountySyncStatus}
            joinedIds={joinedIds}
            query={query}
            stats={stats}
            onCreate={() => setPage("Create")}
            onOpenBounty={(id) => {
              setSelectedBountyId(id);
              setPage("BountyDetails");
            }}
            onQueryChange={setQuery}
            onTabChange={setActiveTab}
          />
        )}

        {page === "M2E TV" && (
          <M2ETVPage
            items={videoFeedItems}
            onCreate={() => setPage("Create")}
            onOpenBounty={(id) => {
              setSelectedBountyId(id);
              setPage("BountyDetails");
            }}
          />
        )}

        {page === "BountyDetails" && selectedBounty && (
          <BountyDetailsPage
            bounty={selectedBounty}
            joined={joinedIds.includes(selectedBounty.id)}
            joining={joiningBountyIds.includes(selectedBounty.id)}
            marketStatus={marketStatus}
            submissionVotes={submissionVotes}
            submissions={submissions[selectedBounty.id] || []}
            onBack={() => setPage("Explore")}
            onFinalizeCommunityWinner={() => handleFinalizeCommunityWinner(selectedBounty.id)}
            onFundBounty={(amount) => handleFundBounty({ bountyId: selectedBounty.id, amount })}
            onJoin={() => handleJoin(selectedBounty.id)}
            onSubmitDare={(submission) => handleDareSubmission(selectedBounty.id, submission)}
            onVoteSubmission={(submissionId, vote) =>
              handleSubmissionVote({ bountyId: selectedBounty.id, submissionId, vote })
            }
          />
        )}

        {page === "BountyDetails" && !selectedBounty && (
          <EmptyDetailsPage onBack={() => setPage("Explore")} />
        )}

        {page === "Create" && (
          <CreatePage
            bountySyncStatus={bountySyncStatus}
            errors={errors}
            form={form}
            onChange={setForm}
            onImageChange={handleBountyImage}
            onSubmit={handleSubmit}
          />
        )}

        {page === "Terms" && (
          <TermsPage
            termsAccepted={termsAccepted}
            onAccept={handleAcceptTerms}
          />
        )}

        {page === "SetupProfile" && (
          <SetupProfilePage
            profile={effectiveProfile}
            status={profileStatus}
            onChange={setProfile}
            onSubmit={handleSetProfile}
          />
        )}

        {page === "Profile" && (
          <ProfilePage
            connected={connected}
            joinedBounties={joinedBounties}
            marketStatus={marketStatus}
            postedBounties={postedBounties}
            profile={effectiveProfile}
            stats={stats}
            submissions={submissions}
            walletAddress={walletAddress}
            onConnect={handleLoginClick}
            onCreate={() => setPage("Create")}
            onLogout={handleLogoutClick}
            onOpenBounty={(id) => {
              setSelectedBountyId(id);
              setPage("BountyDetails");
            }}
            onSelectWinner={handleSelectCreatorWinner}
          />
        )}
      </main>


    </div>
  );
}

function LandingPage({ bounties, stats, onCreate, onExplore }) {
  const featured = bounties.slice(0, 3);
  const steps = [
    {
      title: "Post a clear dare",
      body: "Describe the meme, edit, video, or template you need. Set the reward, deadline, and number of hunters who can join.",
    },
    {
      title: "Fund it with tokens",
      body: "Choose a supported token and funding type. Self-funded dares are backed by the poster, while community-funded dares can gather support.",
    },
    {
      title: "Hunters submit work",
      body: "Joined hunters unlock the submission flow, add their proof or link, and keep every attempt visible in the dare feed.",
    },
  ];
  const useCases = [
    "Launch campaign templates",
    "Reaction packs for X",
    "Mascot art and stickers",
    "Short edits and animations",
    "Community shitpost prompts",
    "Telegram-ready graphics",
  ];

  return (
    <section className="space-y-16">
      <div className="grid min-h-[calc(100vh-8rem)] gap-10 py-6 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-pink">
            <Sparkles size={16} />
            Meme bounties funded onchain
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.94] tracking-normal text-text sm:text-7xl lg:text-8xl">
            <Meme2EarnWordmark />
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-muted">
            Create funded meme dares with tokens, or join open bounties and earn for completed work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-12 items-center justify-center gap-2 bg-pink px-6 text-sm font-bold text-ink transition hover:bg-text hover:text-ink"
              type="button"
              onClick={onExplore}
            >
              Explore dare bounties
              <ChevronRight size={18} />
            </button>
            <button
              className="inline-flex h-12 items-center justify-center gap-2 border border-line bg-surface/80 px-6 text-sm font-bold text-text transition hover:border-pink hover:text-pink"
              type="button"
              onClick={onCreate}
            >
              <Plus size={18} />
              Create dare
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-y border-line bg-white/72 py-6 backdrop-blur-sm">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-3">
              <Stat label="Open bounties" value={stats.open} />
              <Stat label="Coins in play" value={stats.coins} />
              <Stat label="Active hunters" value={stats.hunters} />
            </div>
          </div>
          <div className="grid gap-4 border-y border-line py-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedFaint">For creators</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Turn campaign needs into concrete dares with rewards, slots, deadlines, and a visible submission trail.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedFaint">For hunters</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Find open meme work, join before slots fill, submit links, and build a profile around completed bounties.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 border-y border-line py-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedFaint">How it works</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-text">A simple loop for funded meme work.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Meme2Earn keeps the marketplace direct: a dare defines the job, the reward sets the incentive, and the detail page keeps joins and submissions in one place.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="border-t border-line pt-5">
              <p className="font-mono text-2xl font-bold text-pink">0{index + 1}</p>
              <h3 className="mt-4 font-display text-2xl font-bold text-text">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedFaint">Live dares</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-text">Funded work ready to claim.</h2>
          </div>
          <button className="text-sm font-bold text-pink transition hover:text-text" type="button" onClick={onExplore}>
            View all
          </button>
        </div>
        <div className="border-b border-line">
          {featured.map((bounty) => (
            <button
              key={bounty.id}
              className="grid w-full gap-4 border-t border-line py-5 text-left transition hover:bg-white/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              type="button"
              onClick={onExplore}
            >
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
                  <span className="h-2.5 w-2.5 rounded-full bg-pink" />
                  {bounty.category}
                </p>
                <h3 className="font-display text-xl font-bold text-text">{bounty.title}</h3>
              </div>
              <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-10 border-y border-line py-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-mutedFaint">What people post</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-text">Dares can be tiny, specific, and useful.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            The best bounties are not vague requests for content. They are practical creative briefs with a format, context, reward, and deadline.
          </p>
        </div>
        <div className="grid grid-cols-1 border-b border-line sm:grid-cols-2">
          {useCases.map((item) => (
            <div key={item} className="border-t border-line py-4 sm:odd:border-r sm:odd:pr-5 sm:even:pl-5">
              <p className="flex items-center gap-2 text-sm font-bold text-text">
                <span className="h-2 w-2 rounded-full bg-pink" />
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 py-4 lg:grid-cols-3">
        <div className="border-t border-line pt-5">
          <Wallet size={18} className="text-pink" />
          <h3 className="mt-4 font-display text-2xl font-bold text-text">Privy login and EVM wallets</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Users sign in with X, get an embedded EVM wallet, and can view receive/send tools from their profile.
          </p>
        </div>
        <div className="border-t border-line pt-5">
          <Clock3 size={18} className="text-pink" />
          <h3 className="mt-4 font-display text-2xl font-bold text-text">Deadlines and filled slots</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Every row shows time left, hunter capacity, current status, and the reward before a hunter opens the full dare.
          </p>
        </div>
        <div className="border-t border-line pt-5">
          <Send size={18} className="text-pink" />
          <h3 className="mt-4 font-display text-2xl font-bold text-text">Submission feed</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            Joined hunters can submit their work on the dare page, keeping proof and updates tied to the bounty.
          </p>
        </div>
      </div>

      <footer className="border-t border-line py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <img className="h-9 w-auto" src="/favicon.svg" alt="" />
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Meme2Earn is a bounty interface for token-funded creative dares. Rewards, balances, and submissions are user-generated and should be verified before use.
            </p>
          </div>
          <div className="grid gap-4 text-sm font-bold text-muted sm:grid-cols-3 md:text-right">
            <button className="transition hover:text-pink" type="button" onClick={onExplore}>Explore</button>
            <button className="transition hover:text-pink" type="button" onClick={onCreate}>Create</button>
            <a className="transition hover:text-pink" href="https://github.com/Meme2Earn/Meme2Earn" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint sm:flex-row sm:items-center sm:justify-between">
          <span>
            <Meme2EarnWordmark />
          </span>
          <span>Built for onchain meme bounties</span>
        </div>
      </footer>
    </section>
  );
}

function Meme2EarnWordmark() {
  return (
    <>
      meme<span className="text-pink">2</span>earn
    </>
  );
}

function ExplorePage({
  activeTab,
  bounties,
  bountySyncStatus,
  joinedIds,
  query,
  stats,
  onCreate,
  onOpenBounty,
  onQueryChange,
  onTabChange,
}) {
  return (
    <>
      <section className="grid gap-10 border-b border-line pb-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            <Sparkles size={16} className="text-pink" />
            Meme bounties funded onchain
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.95] tracking-normal text-text sm:text-7xl lg:text-8xl">
            Turn dank into bank.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Create funded meme bounties with meme coins, or join open briefs and earn for completed work.
          </p>
        </div>

        <div className="grid grid-cols-1 min-[420px]:grid-cols-3">
          <Stat label="Open bounties" value={stats.open} />
          <Stat label="Coins in play" value={stats.coins} />
          <Stat label="Active hunters" value={stats.hunters} />
        </div>
      </section>

      <section className="py-6">
        {bountySyncStatus ? (
          <div className="mb-4 border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
            {bountySyncStatus}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full overflow-x-auto border-b border-line lg:w-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`h-10 whitespace-nowrap border-b-2 px-4 text-sm font-bold transition ${
                  activeTab === tab ? "border-pink text-pink" : "border-transparent text-muted hover:text-text"
                }`}
                type="button"
                onClick={() => onTabChange(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:w-[34rem]">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mutedFaint" size={18} />
              <input
                className="h-11 w-full border border-line bg-transparent pl-10 pr-3 text-sm text-text placeholder:text-mutedFaint"
                type="search"
                placeholder="Search bounties"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 bg-pink px-5 text-sm font-bold text-ink transition hover:bg-text"
              type="button"
              onClick={onCreate}
            >
              <Send size={17} />
              Post bounty
            </button>
          </div>
        </div>

        <BountyTable
          bounties={bounties}
          joinedIds={joinedIds}
          onOpenBounty={onOpenBounty}
        />
      </section>
    </>
  );
}

function M2ETVPage({ items, onCreate, onOpenBounty }) {
  const totalRewards = items.reduce((sum, item) => sum + (Number(item.bounty?.reward) || 0), 0);

  return (
    <section className="space-y-8">
      <div className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            <LayoutDashboard size={16} className="text-pink" />
            M2E TV
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.95] tracking-normal text-text sm:text-7xl">
            Watch dare videos.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Scroll through video submissions from meme bounty hunters across the platform.
          </p>
        </div>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2">
          <Stat label="Videos" value={items.length} />
          <Stat label="Rewards shown" value={totalRewards ? formatReward(totalRewards) : 0} />
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mx-auto max-w-4xl space-y-8">
          {items.map(({ bounty, submission }) => (
            <article key={submission.id} className="border-b border-line pb-8">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[bounty.category] }} />
                    {bounty.category}
                    <span className="font-mono text-mutedFaint">{submission.createdAt}</span>
                  </p>
                  <h2 className="font-display text-2xl font-bold text-text">{bounty.title}</h2>
                  <p className="mt-2 text-sm font-bold text-muted">
                    by {submission.author || truncateAddress(submission.walletAddress)}
                  </p>
                </div>
                <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" />
              </div>

              <SubmissionVideo submission={submission} featured />

              {submission.text ? (
                <p className="mt-4 text-sm leading-6 text-muted">{submission.text}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 border border-line px-4 text-sm font-bold text-text transition hover:border-pink hover:text-pink"
                  type="button"
                  onClick={() => onOpenBounty?.(bounty.id)}
                >
                  View dare
                  <ChevronRight size={16} />
                </button>
                <StatusPill status={bounty.status} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-96 flex-col items-center justify-center border-b border-line text-center">
          <p className="font-display text-4xl font-bold text-text">No dare videos yet.</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            Videos submitted by hunters will appear here once dares start receiving entries.
          </p>
          <button
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 bg-pink px-5 text-sm font-bold text-ink transition hover:bg-text"
            type="button"
            onClick={onCreate}
          >
            <Plus size={17} />
            Create dare
          </button>
        </div>
      )}
    </section>
  );
}

function CreatePage({ bountySyncStatus, errors, form, onChange, onImageChange, onSubmit }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="border-b border-line pb-8 lg:border-b-0 lg:border-r lg:pr-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
          <LayoutDashboard size={16} className="text-pink" />
          Create bounty
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-text sm:text-6xl">Fund a brief.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted">
          Post a clear task, set the reward, and choose how many hunters can join before the bounty fills.
        </p>
        <div className="mt-8 grid grid-cols-1 border border-line bg-surface min-[420px]:grid-cols-2">
          <Stat label="Required fields" value={3} />
          <Stat label="Default status" value="Open" />
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        {bountySyncStatus ? (
          <div className="border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
            {bountySyncStatus}
          </div>
        ) : null}

        {errors.form ? (
          <div className="border border-pink/50 bg-pink/10 px-4 py-3 text-sm font-bold text-pink">
            {errors.form}
          </div>
        ) : null}

        <div className="border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-muted">Funding type</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FUNDING_TYPES.map((type) => (
              <label
                key={type.value}
                className={`cursor-pointer border p-4 transition ${
                  form.fundingType === type.value ? "border-pink bg-pink/10" : "border-line hover:border-pink/70"
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="fundingType"
                  value={type.value}
                  checked={form.fundingType === type.value}
                  onChange={(event) => onChange({ ...form, fundingType: event.target.value })}
                />
                <span className="block text-sm font-bold text-text">{type.value}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{type.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-muted">Winner selection</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {WINNER_SELECTION_OPTIONS.map((option) => (
              <label
                key={option}
                className={`cursor-pointer border p-4 text-sm font-bold transition ${
                  form.winnerSelection === option ? "border-pink bg-pink/10 text-text" : "border-line text-muted hover:border-pink/70"
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="winnerSelection"
                  value={option}
                  checked={form.winnerSelection === option}
                  onChange={(event) => onChange({ ...form, winnerSelection: event.target.value })}
                />
                {option}
              </label>
            ))}
          </div>
        </div>

        <Field label="Title" error={errors.title}>
          <input
            className="h-11 w-full border border-line bg-surface px-3 text-sm text-text"
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
          />
        </Field>

        <Field label="Description">
          <textarea
            className="min-h-36 w-full resize-y border border-line bg-surface px-3 py-3 text-sm leading-6 text-text"
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </Field>

        <div className="border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-muted">Bounty image</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid aspect-video w-full place-items-center overflow-hidden border border-line bg-ink sm:w-48">
              {form.image ? (
                <img className="h-full w-full object-cover" src={form.image} alt="" />
              ) : (
                <span className="text-sm text-mutedFaint">No image selected</span>
              )}
            </div>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center border border-line px-5 text-sm font-bold text-text transition hover:border-pink hover:text-pink">
              Upload bounty image
              <input className="sr-only" type="file" accept="image/*" onChange={onImageChange} />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              className="h-11 w-full border border-line bg-surface px-3 text-sm text-text"
              value={form.category}
              onChange={(event) => onChange({ ...form, category: event.target.value })}
            >
              {Object.keys(CATEGORY_COLORS).map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Deadline">
            <input
              className="h-11 w-full border border-line bg-surface px-3 font-mono text-sm text-text"
              type="date"
              value={form.deadline}
              onChange={(event) => onChange({ ...form, deadline: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">Bounty amount</p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:gap-0">
              <input
                className="h-11 w-full border border-line bg-surface px-3 font-mono text-sm text-text"
                min="1"
                type="number"
                value={form.reward}
                onChange={(event) => onChange({ ...form, reward: event.target.value })}
              />
              <div className="flex h-11 items-center border border-line bg-surface sm:border-l-0">
                <div className="pl-3">
                  <TokenLogo token={form.coin} size="sm" />
                </div>
                <select
                  className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm font-bold text-gold outline-none"
                  value={form.coin}
                  onChange={(event) => onChange({ ...form, coin: event.target.value })}
                >
                  {TOKEN_OPTIONS.map((token) => (
                    <option key={token} value={token}>
                      ${token}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.reward || errors.coin ? (
              <p className="mt-2 text-sm text-pink">{errors.reward || errors.coin}</p>
            ) : null}
          </div>
          <Field label="Max hunters">
            <input
              className="h-11 w-full border border-line bg-surface px-3 font-mono text-sm text-text"
              min="1"
              type="number"
              value={form.maxApplicants}
              onChange={(event) => onChange({ ...form, maxApplicants: event.target.value })}
            />
          </Field>
        </div>

        <button className="h-12 w-full bg-pink text-sm font-bold text-ink transition hover:bg-text" type="submit">
          Submit bounty
        </button>
      </form>
    </section>
  );
}

function TermsPage({ termsAccepted, onAccept }) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="border-b border-line pb-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
          <Sparkles size={16} className="text-pink" />
          Terms and conditions
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-text sm:text-6xl">Before you continue.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Review and accept the terms to finish setting up your meme2earn account.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <div className="border border-line bg-surface p-4">
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-3 text-sm leading-6 text-muted">
            {profileTerms.map((term, index) => (
              <p key={term}>
                <span className="font-mono text-xs text-mutedFaint">{index + 1}.</span> {term}
              </p>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm leading-6 text-muted">
          <input
            className="mt-1 h-4 w-4 accent-pink"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => {
              if (event.target.checked) onAccept();
            }}
          />
          <span>I have read and agree to the terms and conditions.</span>
        </label>

        <button
          className="h-12 w-full bg-pink text-sm font-bold text-ink transition hover:bg-text"
          type="button"
          onClick={onAccept}
        >
          Continue
        </button>
      </div>
    </section>
  );
}

function SetupProfilePage({ profile, status, onChange, onSubmit }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="border-b border-line pb-8 lg:border-b-0 lg:border-r lg:pr-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
          <User size={16} className="text-pink" />
          Set profile
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-text sm:text-6xl">Create your hunter profile.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted">
          Confirm the name and profile image from your X account before joining or posting bounties.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="flex items-center gap-5 border-b border-line pb-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface">
            {profile.avatar ? (
              <img className="h-full w-full object-cover" src={profile.avatar} alt="" />
            ) : (
              <User size={34} className="text-mutedFaint" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-text">X profile picture</p>
            <p className="mt-1 text-sm leading-6 text-muted">Used automatically when X provides one.</p>
          </div>
        </div>

        {status ? (
          <div className="border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
            {status}
          </div>
        ) : null}

        <Field label="Username">
          <input
            className="h-11 w-full border border-line bg-surface px-3 text-sm text-text"
            value={profile.username}
            onChange={(event) => onChange({ ...profile, username: event.target.value })}
          />
        </Field>

        <button
          className="h-12 w-full bg-pink text-sm font-bold text-ink transition hover:bg-text"
          type="submit"
        >
          Set profile
        </button>
      </form>
    </section>
  );
}

function ProfilePage({
  connected,
  joinedBounties,
  marketStatus = "",
  postedBounties,
  profile,
  stats,
  submissions = {},
  walletAddress,
  onConnect,
  onCreate,
  onLogout,
  onOpenBounty,
  onSelectWinner,
}) {
  const totalPostedRewards = postedBounties.reduce((sum, bounty) => sum + bounty.reward, 0);
  const [expandedBountyId, setExpandedBountyId] = useState(postedBounties[0]?.id || "");
  const [sendForm, setSendForm] = useState({
    recipient: "",
    amount: "",
    token: TOKEN_OPTIONS[0],
  });
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletStatus, setWalletStatus] = useState("");
  const [walletError, setWalletError] = useState("");
  const selectedTokenBalance = "0.00";

  useEffect(() => {
    if (!expandedBountyId && postedBounties[0]?.id) {
      setExpandedBountyId(postedBounties[0].id);
    }
  }, [expandedBountyId, postedBounties]);

  async function handleCopyAddress() {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setWalletStatus("Wallet address copied.");
      setWalletError("");
    } catch {
      setWalletError("Could not copy address. Select and copy it manually.");
      setWalletStatus("");
    }
  }

  function handleSendToken(event) {
    event.preventDefault();
    const amount = Number(sendForm.amount);
    const recipient = sendForm.recipient.trim();

    if (!connected) {
      setWalletError("Login to send tokens.");
      setWalletStatus("");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setWalletError("Enter a valid EVM wallet address.");
      setWalletStatus("");
      return;
    }

    if (!amount || amount <= 0) {
      setWalletError("Enter an amount greater than 0.");
      setWalletStatus("");
      return;
    }

    setWalletError("");
    setWalletStatus(
      `Transfer ready: ${sendForm.amount} ${sendForm.token} to ${truncateAddress(recipient)}.`,
    );
    setSendForm((current) => ({ ...current, recipient: "", amount: "" }));
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface">
            {connected && profile.avatar ? (
              <img className="h-full w-full object-cover" src={profile.avatar} alt="" />
            ) : (
              <User size={34} className="text-mutedFaint" />
            )}
          </div>
          <div>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            <User size={16} className="text-pink" />
            Profile
          </p>
          <h1 className="break-words font-display text-4xl font-bold leading-tight text-text sm:text-6xl">
            {connected ? profile.username || truncateAddress(walletAddress) : "Wallet not connected"}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Track bounties you joined, briefs you posted, and basic activity from the current session.
          </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-self-end">
          <button
            className={`inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-bold transition ${
              connected
                ? "bg-pink text-ink hover:bg-text"
                : "border border-line bg-transparent text-text hover:border-pink hover:text-pink"
            }`}
            type="button"
            onClick={connected ? onCreate : onConnect}
          >
            {connected ? <Plus size={17} /> : <User size={17} />}
            {connected ? "Create bounty" : "Login"}
          </button>
          {connected ? (
            <button
              className="inline-flex h-11 items-center justify-center border border-line px-5 text-sm font-bold text-text transition hover:border-pink hover:text-pink"
              type="button"
              onClick={onLogout}
            >
              Log out
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid border border-line bg-surface min-[420px]:grid-cols-2 sm:grid-cols-4">
        <Stat label="Joined" value={joinedBounties.length} />
        <Stat label="Posted" value={postedBounties.length} />
        <Stat label="Open market" value={stats.open} />
        <Stat label="Posted rewards" value={totalPostedRewards ? formatReward(totalPostedRewards) : 0} />
      </div>

      <section className="flex flex-col gap-4 border-y border-line py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
            <Wallet size={16} className="text-pink" />
            Wallet
          </p>
          <h2 className="font-display text-3xl font-bold text-text">Wallet tools</h2>
          <p className="mt-2 font-mono text-sm font-bold text-muted">
            {connected ? truncateAddress(walletAddress) : "Not connected"}
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 bg-pink px-5 text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
          type="button"
          onClick={() => setWalletOpen(true)}
          disabled={!connected}
        >
          <Wallet size={16} />
          Wallet tools
        </button>
      </section>

      {walletOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-y-auto border border-line bg-ink p-4 shadow-2xl sm:p-5">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
                  <Wallet size={16} className="text-pink" />
                  Wallet tools
                </p>
                <h2 className="font-display text-3xl font-bold text-text sm:text-4xl">Receive and send tokens.</h2>
                <p className="mt-3 break-all font-mono text-sm font-bold text-muted">
                  {walletAddress || "Wallet pending"}
                </p>
              </div>
              <button
                className="grid h-10 w-10 shrink-0 place-items-center border border-line text-muted transition hover:border-pink hover:text-pink"
                type="button"
                onClick={() => setWalletOpen(false)}
                aria-label="Close wallet tools"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 grid border border-line bg-surface sm:grid-cols-3">
              <div className="border-b border-line px-4 py-4 sm:border-b-0 sm:border-r">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Selected token</p>
                <div className="mt-2 flex min-w-0 items-center gap-3">
                  <TokenLogo token={sendForm.token} />
                  <p className="break-words font-mono text-2xl font-bold text-text">{sendForm.token}</p>
                </div>
              </div>
              <div className="border-b border-line px-4 py-4 sm:border-b-0 sm:border-r">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Available balance</p>
                <p className="mt-2 break-words font-mono text-2xl font-bold text-gold">
                  {selectedTokenBalance} {sendForm.token}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Wallet</p>
                <p className="mt-2 font-mono text-sm font-bold text-muted">
                  {walletAddress ? truncateAddress(walletAddress) : "Pending"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4 border border-line bg-surface p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Receive</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Use this address to receive supported tokens.</p>
                </div>
                <div className="break-all border border-line bg-ink px-3 py-3 font-mono text-sm font-bold text-text">
                  {walletAddress || "Wallet pending"}
                </div>
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 border border-line text-sm font-bold text-text transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:text-mutedFaint"
                  type="button"
                  onClick={handleCopyAddress}
                  disabled={!walletAddress}
                >
                  <Copy size={16} />
                  Copy address
                </button>
              </div>

              <form className="space-y-4 border border-line bg-surface p-4" onSubmit={handleSendToken}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Send</p>
                  <p className="mt-2 text-sm leading-6 text-muted">Enter a recipient address and token amount.</p>
                </div>

                {walletError ? (
                  <div className="border border-pink/50 bg-pink/10 px-3 py-2 text-sm font-bold text-pink">
                    {walletError}
                  </div>
                ) : null}
                {walletStatus ? (
                  <div className="border border-line bg-ink px-3 py-2 text-sm font-bold text-muted">
                    {walletStatus}
                  </div>
                ) : null}

                <Field label="Recipient wallet">
                  <input
                    className="h-11 w-full border border-line bg-ink px-3 font-mono text-sm text-text placeholder:text-mutedFaint"
                    placeholder="0x..."
                    value={sendForm.recipient}
                    onChange={(event) => setSendForm({ ...sendForm, recipient: event.target.value })}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                  <Field label="Amount">
                    <input
                      className="h-11 w-full border border-line bg-ink px-3 font-mono text-sm text-text placeholder:text-mutedFaint"
                      min="0"
                      step="any"
                      type="number"
                      value={sendForm.amount}
                      onChange={(event) => setSendForm({ ...sendForm, amount: event.target.value })}
                    />
                  </Field>
                  <Field label="Token">
                    <div className="flex h-11 items-center border border-line bg-ink">
                      <div className="pl-3">
                        <TokenLogo token={sendForm.token} size="sm" />
                      </div>
                      <select
                        className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-text outline-none"
                        value={sendForm.token}
                        onChange={(event) => setSendForm({ ...sendForm, token: event.target.value })}
                      >
                        {TOKEN_OPTIONS.map((token) => (
                          <option key={token} value={token}>
                            {token}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>

                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 bg-pink text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
                  type="submit"
                  disabled={!connected}
                >
                  <Send size={16} />
                  Send tokens
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <ProfileList title="Joined bounties" empty="Joined bounties will appear here." bounties={joinedBounties} />
        <CreatorBountyPanel
          bounties={postedBounties}
          empty="Posted bounties will appear here."
          marketStatus={marketStatus}
          submissions={submissions}
          expandedBountyId={expandedBountyId}
          onOpenBounty={onOpenBounty}
          onSelectWinner={onSelectWinner}
          onToggleBounty={(id) => setExpandedBountyId((current) => (current === id ? "" : id))}
        />
      </div>
    </section>
  );
}

function BountyTable({ bounties, joinedIds, onOpenBounty }) {
  return (
    <>
      <div className="hidden grid-cols-[minmax(0,1.55fr)_11rem_7rem_8rem_minmax(12rem,0.75fr)_2rem] gap-5 border-b border-line px-1 py-3 text-xs font-bold uppercase tracking-[0.14em] text-mutedFaint min-[860px]:grid">
        <span>Bounty</span>
        <span>Hunters</span>
        <span>Time left</span>
        <span>Status</span>
        <span className="text-right">Reward</span>
        <span />
      </div>

      {bounties.length > 0 ? (
        <div className="border-b border-line">
          {bounties.map((bounty) => (
            <BountyRow
              key={bounty.id}
              bounty={bounty}
              joined={joinedIds.includes(bounty.id)}
              onOpen={() => onOpenBounty(bounty.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center border-b border-line text-center">
          <p className="font-display text-3xl font-bold text-text">No bounties found.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Try a different tab or search term, or post a new bounty for hunters to pick up.
          </p>
        </div>
      )}
    </>
  );
}

function ProfileList({ title, empty, bounties }) {
  return (
    <div className="border-t border-line">
      <h2 className="py-4 font-display text-2xl font-bold text-text">{title}</h2>
      {bounties.length > 0 ? (
        bounties.map((bounty) => (
          <div key={bounty.id} className="grid gap-3 border-t border-line py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[bounty.category] }} />
                {bounty.category}
              </p>
              <h3 className="font-display text-xl font-bold text-text">{bounty.title}</h3>
            </div>
            <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" />
          </div>
        ))
      ) : (
        <div className="border-t border-line py-10 text-sm text-muted">{empty}</div>
      )}
    </div>
  );
}

function CreatorBountyPanel({
  bounties,
  empty,
  expandedBountyId,
  marketStatus,
  onOpenBounty,
  onSelectWinner,
  onToggleBounty,
  submissions,
}) {
  return (
    <div className="border-t border-line">
      <h2 className="py-4 font-display text-2xl font-bold text-text">Posted bounties</h2>
      {marketStatus ? (
        <div className="mb-4 border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
          {marketStatus}
        </div>
      ) : null}
      {bounties.length > 0 ? (
        bounties.map((bounty) => {
          const bountySubmissions = submissions[bounty.id] || [];
          const isExpanded = expandedBountyId === bounty.id;
          const creatorDecides = (bounty.winnerSelection || "Community decides") === "Creator decides";
          const winner = bountySubmissions.find((submission) => submission.id === bounty.winnerSubmissionId);

          return (
            <div key={bounty.id} className="border-t border-line py-4">
              <button
                className="grid w-full gap-3 text-left sm:grid-cols-[1fr_auto] sm:items-center"
                type="button"
                onClick={() => onToggleBounty?.(bounty.id)}
              >
                <div>
                  <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[bounty.category] }} />
                    {bounty.category}
                    <span className="font-mono text-mutedFaint">{bountySubmissions.length} submissions</span>
                    {creatorDecides ? <span className="font-mono text-pink">Creator decides</span> : null}
                  </p>
                  <h3 className="font-display text-xl font-bold text-text">{bounty.title}</h3>
                  {winner ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-gold">
                      <Trophy size={15} />
                      Winner selected: {winner.author || truncateAddress(winner.walletAddress)}
                    </p>
                  ) : null}
                </div>
                <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" />
              </button>

              {isExpanded ? (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="mb-4 flex flex-wrap gap-3">
                    <button
                      className="inline-flex h-10 items-center justify-center border border-line px-4 text-sm font-bold text-text transition hover:border-pink hover:text-pink"
                      type="button"
                      onClick={() => onOpenBounty?.(bounty.id)}
                    >
                      View details
                    </button>
                    <StatusPill status={bounty.status} />
                  </div>

                  {bountySubmissions.length > 0 ? (
                    <div className="space-y-4">
                      {bountySubmissions.map((submission) => (
                        <CreatorSubmissionRow
                          key={submission.id}
                          bounty={bounty}
                          creatorDecides={creatorDecides}
                          selected={bounty.winnerSubmissionId === submission.id}
                          submission={submission}
                          onSelectWinner={() => onSelectWinner?.({ bountyId: bounty.id, submissionId: submission.id })}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="border-t border-line py-5 text-sm text-muted">No dare contents submitted yet.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="border-t border-line py-10 text-sm text-muted">{empty}</div>
      )}
    </div>
  );
}

function CreatorSubmissionRow({ bounty, creatorDecides, onSelectWinner, selected, submission }) {
  return (
    <div className={`border border-line bg-surface p-4 ${selected ? "border-gold/60" : ""}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-ink">
            {submission.avatar ? (
              <img className="h-full w-full object-cover" src={submission.avatar} alt="" />
            ) : (
              <User size={16} className="text-mutedFaint" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-text">{submission.author}</p>
            <p className="font-mono text-xs text-mutedFaint">{submission.createdAt}</p>
          </div>
        </div>
        {selected ? (
          <span className="inline-flex h-8 items-center gap-2 border border-gold/50 px-3 text-xs font-bold text-gold">
            <Trophy size={14} />
            Winner
          </span>
        ) : null}
      </div>
      <SubmissionVideo submission={submission} />
      {submission.text ? <p className="mt-3 text-sm leading-6 text-muted">{submission.text}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs font-bold text-muted">
          {truncateAddress(submission.walletAddress)}
        </span>
        {creatorDecides ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 bg-pink px-4 text-xs font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
            type="button"
            disabled={selected}
            onClick={onSelectWinner}
          >
            <Trophy size={14} />
            {selected ? "Selected winner" : "Select winner"}
          </button>
        ) : (
          <span className="font-mono text-xs font-bold text-muted">
            Score {Number(submission.score) || 0}
          </span>
        )}
        {bounty.status === "Completed" && !selected ? (
          <span className="text-xs font-bold text-mutedFaint">Campaign closed</span>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0 border-b border-line px-4 py-4 last:border-b-0 min-[420px]:border-b-0 min-[420px]:border-r min-[420px]:py-1 min-[420px]:last:border-r-0 sm:px-6">
      <p className="break-words font-mono text-3xl font-bold text-pink sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">{label}</p>
    </div>
  );
}

function TokenLogo({ size = "md", token }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = getTokenLogoUrl(token);
  const sizeClass = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const paddingClass = size === "sm" ? "p-0.5" : "p-1";
  const containedLogo = CONTAINED_LOGO_TOKENS.has(token);
  const textClass = size === "lg" ? "text-[0.65rem]" : size === "sm" ? "text-[0.55rem]" : "text-[0.6rem]";
  const fallbackLabel = String(token || "?")
    .replace(/[^A-Z0-9]/gi, "")
    .slice(0, size === "sm" ? 2 : 3)
    .toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (!logoUrl || failed) {
    return (
      <span className={`${sizeClass} ${textClass} inline-grid shrink-0 place-items-center rounded-full border border-gold/50 bg-gold/10 font-mono font-bold text-gold`}>
        {fallbackLabel}
      </span>
    );
  }

  if (!containedLogo) {
    return (
      <img
        className={`${sizeClass} shrink-0 rounded-full border border-line bg-surface object-cover`}
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className={`${sizeClass} ${paddingClass} inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-white`}>
      <img
        className="h-full w-full rounded-full object-contain"
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    </span>
  );
}

function RewardAmount({ amount, align = "left", coin, size = "md" }) {
  const textSize = size === "lg" ? "text-4xl sm:text-5xl" : size === "row" ? "text-2xl min-[860px]:text-3xl" : "text-2xl";

  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "justify-start sm:justify-end" : ""}`}>
      <TokenLogo token={coin} size={size === "lg" ? "lg" : "md"} />
      <span className={`break-words font-mono font-bold leading-none text-gold ${textSize}`}>
        {formatReward(amount)} ${coin}
      </span>
    </div>
  );
}

function BountyRow({ bounty, joined, onOpen }) {
  const urgent = bounty.daysLeft <= 3 && bounty.status !== "Completed";

  return (
    <article className="border-t border-line first:border-t-0">
      <button
        className="grid w-full gap-4 px-1 py-7 text-left transition hover:bg-surface/35 min-[860px]:grid-cols-[minmax(0,1.55fr)_11rem_7rem_8rem_minmax(12rem,0.75fr)_2rem] min-[860px]:items-center"
        type="button"
        onClick={onOpen}
      >
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[bounty.category] }}
            />
            {bounty.category}
            {joined ? <span className="font-mono text-pink">Joined</span> : null}
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight text-text">{bounty.title}</h2>
        </div>

        <HunterProgress applicants={bounty.applicants} maxApplicants={bounty.maxApplicants} />
        <Metric icon={<Clock3 size={17} />} value={bounty.status === "Completed" ? "Done" : `${bounty.daysLeft}d`} urgent={urgent} />
        <StatusPill status={bounty.status} />
        <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" size="row" />
        <div className="hidden justify-end text-muted min-[860px]:flex">
          <ChevronRight size={22} />
        </div>
      </button>
    </article>
  );
}

function BountyDetailsPage({
  bounty,
  joined,
  joining = false,
  marketStatus = "",
  submissionVotes = {},
  submissions = [],
  onBack,
  onFinalizeCommunityWinner,
  onFundBounty,
  onJoin,
  onSubmitDare,
  onVoteSubmission,
}) {
  const [fundAmount, setFundAmount] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [submissionVideo, setSubmissionVideo] = useState(null);
  const [submissionVideoPreview, setSubmissionVideoPreview] = useState("");
  const isFull = bounty.applicants >= bounty.maxApplicants;
  const canSubmit = joined && bounty.status !== "Completed";
  const urgent = bounty.daysLeft <= 3 && bounty.status !== "Completed";
  const communityDecides = (bounty.winnerSelection || "Community decides") === "Community decides";
  const communityFunded = bounty.fundingType === "Community-Funded Dare";
  const creatorDecides = (bounty.winnerSelection || "Community decides") === "Creator decides";
  const voteLeader = useMemo(() => {
    if (!communityDecides || submissions.length === 0) return null;
    const sorted = [...submissions].sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0);
    });
    return sorted[0]?.id ? sorted[0] : null;
  }, [communityDecides, submissions]);
  const selectedWinner = useMemo(
    () => submissions.find((submission) => submission.id === bounty.winnerSubmissionId) || null,
    [bounty.winnerSubmissionId, submissions],
  );
  const voteClosed = bounty.status === "Completed" || bounty.daysLeft <= 0;
  const canFinalizeCommunityWinner =
    communityDecides && bounty.status !== "Completed" && bounty.daysLeft <= 0 && submissions.length > 0 && voteLeader;

  useEffect(() => {
    return () => {
      if (submissionVideoPreview) URL.revokeObjectURL(submissionVideoPreview);
    };
  }, [submissionVideoPreview]);

  function handleVideoChange(event) {
    const file = event.target.files?.[0] || null;
    if (submissionVideoPreview) URL.revokeObjectURL(submissionVideoPreview);
    setSubmissionVideo(file);
    setSubmissionVideoPreview(file ? URL.createObjectURL(file) : "");
  }

  function handleSubmission(event) {
    event.preventDefault();
    if (!canSubmit || !submissionVideo) return;
    onSubmitDare?.({ note: submissionNote, videoFile: submissionVideo });
    if (submissionVideoPreview) URL.revokeObjectURL(submissionVideoPreview);
    setSubmissionNote("");
    setSubmissionVideo(null);
    setSubmissionVideoPreview("");
    event.currentTarget.reset();
  }

  function handleFundSubmit(event) {
    event.preventDefault();
    onFundBounty?.(fundAmount);
    setFundAmount("");
  }

  return (
    <section className="space-y-8">
      <button
        className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-bold text-muted transition hover:border-pink hover:text-pink"
        type="button"
        onClick={onBack}
      >
        <ChevronRight className="rotate-180" size={17} />
        Back to Explore
      </button>

      <div className="grid gap-8 border-b border-line pb-8 min-[900px]:grid-cols-[minmax(0,1fr)_24rem]">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[bounty.category] }} />
            {bounty.category}
          </p>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight text-text sm:text-6xl">{bounty.title}</h1>
        </div>

        <div className="space-y-4 min-[900px]:text-right">
          <RewardAmount amount={bounty.reward} coin={bounty.coin} align="right" size="lg" />
          <div className="flex flex-wrap gap-3 min-[900px]:justify-end">
            <StatusPill status={bounty.status} />
            <Metric icon={<Clock3 size={17} />} value={bounty.status === "Completed" ? "Done" : `${bounty.daysLeft}d`} urgent={urgent} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {marketStatus ? (
            <div className="border border-line bg-surface px-4 py-3 text-sm font-bold text-muted">
              {marketStatus}
            </div>
          ) : null}

          {bounty.image ? (
            <div className="overflow-hidden border border-line bg-surface">
              <img className="max-h-[28rem] w-full object-cover" src={bounty.image} alt="" />
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Dare details</p>
            <p className="max-w-3xl text-sm leading-7 text-muted">{bounty.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-line py-4 md:grid-cols-3 xl:grid-cols-7">
            <Detail label="Poster" value={truncateAddress(bounty.poster)} />
            <Detail label="Funding" value={bounty.fundingType || "Self-Funded Dare"} />
            <Detail label="Winner selection" value={bounty.winnerSelection || "Community decides"} />
            <Detail label="Deadline" value={bounty.deadline || "Open"} />
            <Detail label="Slots" value={`${bounty.applicants}/${bounty.maxApplicants}`} />
            <Detail label="Reward" value={`${formatReward(bounty.reward)} $${bounty.coin}`} highlight />
            <Detail label="Escrow" value={bounty.escrowStatus || "Not created"} />
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Submission feed</p>
              {communityDecides ? (
                <p className="font-mono text-xs font-bold text-muted">
                  {voteClosed ? "Voting closed" : "Community voting open"}
                </p>
              ) : null}
            </div>
            {communityDecides && voteLeader ? (
              <div className="mb-4 border border-line bg-surface px-4 py-3 text-sm text-muted">
                <span className="inline-flex items-center gap-2 font-bold text-text">
                  <Trophy size={16} className="text-gold" />
                  {voteClosed ? "Winner by community vote" : "Current leader"}
                </span>
                <span className="ml-2 font-mono text-gold">{Number(voteLeader.score) || 0}</span>
              </div>
            ) : null}
            {canFinalizeCommunityWinner ? (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-gold/40 bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-text">Community voting has closed.</p>
                  <p className="mt-1 text-sm text-muted">
                    Finalize the top-voted submission and release escrow.
                  </p>
                </div>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 bg-gold px-4 text-sm font-bold text-ink transition hover:bg-text"
                  type="button"
                  onClick={onFinalizeCommunityWinner}
                >
                  <Trophy size={16} />
                  Finalize community winner
                </button>
              </div>
            ) : null}
            {selectedWinner ? (
              <div className="mb-4 border border-gold/40 bg-surface px-4 py-3 text-sm text-muted">
                <span className="inline-flex items-center gap-2 font-bold text-text">
                  <Trophy size={16} className="text-gold" />
                  {creatorDecides ? "Winner selected by creator" : "Winner finalized by community vote"}
                </span>
                <span className="ml-2 font-bold text-gold">{selectedWinner.author}</span>
              </div>
            ) : null}
            {submissions.length > 0 ? (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface">
                        {submission.avatar ? (
                          <img className="h-full w-full object-cover" src={submission.avatar} alt="" />
                        ) : (
                          <User size={15} className="text-mutedFaint" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">{submission.author}</p>
                        <p className="font-mono text-xs text-mutedFaint">{submission.createdAt}</p>
                      </div>
                    </div>
                    <SubmissionVideo submission={submission} />
                    {submission.text ? <p className="mt-3 text-sm leading-6 text-muted">{submission.text}</p> : null}
                    {bounty.winnerSubmissionId === submission.id ? (
                      <span className="mt-4 inline-flex h-8 items-center gap-2 border border-gold/50 px-3 text-xs font-bold text-gold">
                        <Trophy size={14} />
                        Winner
                      </span>
                    ) : null}
                    {communityDecides ? (
                      <SubmissionVoteControls
                        disabled={voteClosed}
                        leader={voteLeader?.id === submission.id}
                        score={Number(submission.score) || 0}
                        upvotes={Number(submission.upvotes) || 0}
                        downvotes={Number(submission.downvotes) || 0}
                        userVote={submissionVotes[submission.id] || 0}
                        onVote={(vote) => onVoteSubmission?.(submission.id, vote)}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-line py-5 text-sm text-muted">No submissions yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {communityFunded ? (
            <form className="border border-line bg-surface p-4" onSubmit={handleFundSubmit}>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Community funding</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Fund this dare with ${bounty.coin}. Funds stay in escrow until a winner is finalized.
              </p>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto]">
                <input
                  className="h-11 min-w-0 border border-line bg-ink px-3 font-mono text-sm text-text"
                  min="0"
                  step="any"
                  type="number"
                  value={fundAmount}
                  onChange={(event) => setFundAmount(event.target.value)}
                  placeholder="Amount"
                />
                <button
                  className="h-11 bg-gold px-4 text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
                  type="submit"
                  disabled={!bounty.escrowBountyId || bounty.status === "Completed"}
                >
                  Fund
                </button>
              </div>
            </form>
          ) : null}
          <HunterProgress applicants={bounty.applicants} maxApplicants={bounty.maxApplicants} />
          <button
            className="h-11 w-full bg-pink px-5 text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
            type="button"
            disabled={joining || isFull || joined || bounty.status === "Completed"}
            onClick={onJoin}
          >
            {joining ? "Joining Bounty" : joined ? "Joined" : isFull ? "Full" : bounty.status === "Completed" ? "Closed" : "Join bounty"}
          </button>

          {canSubmit ? (
            <form className="space-y-3" onSubmit={handleSubmission}>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Upload video</span>
                <input
                  className="block w-full cursor-pointer border border-line bg-surface text-sm text-muted file:mr-4 file:h-11 file:border-0 file:bg-pink file:px-4 file:text-sm file:font-bold file:text-ink hover:file:bg-text"
                  accept="video/*"
                  type="file"
                  onChange={handleVideoChange}
                />
              </label>
              {submissionVideoPreview ? (
                <video className="max-h-56 w-full border border-line bg-black object-contain" src={submissionVideoPreview} controls />
              ) : null}
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Caption or proof note</span>
                <textarea
                  className="min-h-32 w-full resize-y border border-line bg-surface px-3 py-3 text-sm leading-6 text-text placeholder:text-mutedFaint"
                  placeholder="Optional note, context, or proof of completion."
                  value={submissionNote}
                  onChange={(event) => setSubmissionNote(event.target.value)}
                />
              </label>
              <button
                className="h-11 w-full border border-line text-sm font-bold text-text transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:text-mutedFaint"
                type="submit"
                disabled={!submissionVideo}
              >
                Submit video
              </button>
            </form>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function EmptyDetailsPage({ onBack }) {
  return (
    <section className="flex min-h-96 flex-col items-center justify-center text-center">
      <p className="font-display text-4xl font-bold text-text">Bounty not found.</p>
      <button
        className="mt-6 inline-flex h-11 items-center justify-center border border-line px-5 text-sm font-bold text-text transition hover:border-pink hover:text-pink"
        type="button"
        onClick={onBack}
      >
        Back to Explore
      </button>
    </section>
  );
}

function SubmissionVideo({ featured = false, submission }) {
  if (!submission.videoUrl) return null;

  return (
    <div className="mt-3 overflow-hidden border border-line bg-black">
      <video
        className={`${featured ? "max-h-[70vh]" : "max-h-[28rem]"} w-full object-contain`}
        controls
        preload="metadata"
        src={submission.videoUrl}
      />
      <div className="border-t border-line bg-surface px-3 py-2">
        <p className="truncate font-mono text-xs font-bold text-muted">
          {submission.videoName || "Submitted video"}
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value, highlight = false }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">{label}</p>
      <p className={`font-mono text-sm font-bold ${highlight ? "text-gold" : "text-muted"}`}>{value}</p>
    </div>
  );
}

function SubmissionVoteControls({ disabled, downvotes, leader, onVote, score, upvotes, userVote }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        className={`inline-flex h-9 items-center gap-2 border px-3 text-xs font-bold transition ${
          userVote === 1 ? "border-pink bg-pink/10 text-pink" : "border-line text-muted hover:border-pink hover:text-pink"
        } disabled:cursor-not-allowed disabled:border-line disabled:text-mutedFaint`}
        type="button"
        disabled={disabled}
        onClick={() => onVote?.(1)}
      >
        <ThumbsUp size={15} />
        <span className="font-mono">{upvotes}</span>
      </button>
      <button
        className={`inline-flex h-9 items-center gap-2 border px-3 text-xs font-bold transition ${
          userVote === -1 ? "border-pink bg-pink/10 text-pink" : "border-line text-muted hover:border-pink hover:text-pink"
        } disabled:cursor-not-allowed disabled:border-line disabled:text-mutedFaint`}
        type="button"
        disabled={disabled}
        onClick={() => onVote?.(-1)}
      >
        <ThumbsDown size={15} />
        <span className="font-mono">{downvotes}</span>
      </button>
      <span className="font-mono text-sm font-bold text-gold">Score {score}</span>
      {leader ? (
        <span className="inline-flex h-8 items-center gap-2 border border-gold/40 px-3 text-xs font-bold text-gold">
          <Trophy size={14} />
          Leading
        </span>
      ) : null}
    </div>
  );
}

function Metric({ icon, value, urgent = false }) {
  return (
    <div className={`flex items-center gap-2 font-mono text-sm font-bold ${urgent ? "text-pink" : "text-muted"}`}>
      {icon}
      {value}
    </div>
  );
}

function HunterProgress({ applicants, maxApplicants }) {
  const percent = Math.min(100, Math.round((applicants / maxApplicants) * 100));

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 font-mono text-sm font-bold text-muted">
        <span>{applicants}/{maxApplicants}</span>
        <span className="text-xs text-mutedFaint">hunters</span>
      </div>
      <div className="h-px w-full bg-line">
        <div className="h-px bg-lime" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    Open: "border-pink/35 text-pink",
    "In Progress": "border-pink/35 text-pink",
    Completed: "border-mutedFaint/50 text-muted",
  };

  return (
    <span className={`inline-flex h-8 w-fit items-center border px-3 text-xs font-bold ${styles[status]}`}>
      {status}
    </span>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-muted">{label}</span>
      {children}
      {error && <span className="mt-2 block text-sm text-pink">{error}</span>}
    </label>
  );
}

export default App;




