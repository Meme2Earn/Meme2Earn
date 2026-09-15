import React, { useMemo, useState } from "react";
import {
  ChevronRight,
  Clock3,
  Compass,
  LayoutDashboard,
  Plus,
  Search,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";

const CATEGORY_COLORS = {
  "Meme Template": "#FF3EA0",
  "Edit / Remix": "#FF3EA0",
  "Original Art": "#FF3EA0",
  "Video / Animation": "#FF3EA0",
  "Copy / Shitpost": "#FF3EA0",
};

const TABS = ["Open", "In Progress", "Completed", "All"];
const PAGES = ["Explore", "Create", "Profile"];
const fullWalletAddress = "0x9F42B01228AFcC4d88A39eB114F77CE33D70C19A";
const TOKEN_OPTIONS = ["USDG", "USDC", "PONS", "CASH CAT", "ARTIFICIAL INU", "NVDA", "APPL", "MSFT"];
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

const seedBounties = [
  {
    id: 1,
    title: "Make our launch chart look legally unstoppable",
    description:
      "Create a shareable template using our token chart, mascot, and a clean caption area. Needs to work on X and Telegram without tiny text.",
    category: "Meme Template",
    reward: 6800000,
    coin: "PEPE",
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
    coin: "BONK",
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
    coin: "WOJAK",
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
    coin: "FLOKI",
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
    coin: "SHIB",
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
    coin: "DOGE",
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
  category: "Meme Template",
  reward: "",
  coin: "USDG",
  maxApplicants: 10,
  deadline: "",
};

const blankProfile = {
  username: "",
  avatar: "",
  bio: "",
};

const profileTerms = [
  "By setting a profile, you confirm that the username, profile picture, and bio you provide are owned by you, licensed to you, or otherwise lawful for you to use on meme2earn.",
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
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getDaysLeft(dateValue) {
  if (!dateValue) return 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(`${dateValue}T00:00:00`);
  return Math.max(0, Math.ceil((deadline - today) / 86400000));
}

function App() {
  const [page, setPage] = useState("Explore");
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("Open");
  const [query, setQuery] = useState("");
  const [bounties, setBounties] = useState(seedBounties);
  const [selectedBountyId, setSelectedBountyId] = useState(null);
  const [joinedIds, setJoinedIds] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [profile, setProfile] = useState(blankProfile);
  const [profileComplete, setProfileComplete] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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
    () => bounties.filter((bounty) => bounty.poster === fullWalletAddress),
    [bounties],
  );

  const joinedBounties = useMemo(
    () => bounties.filter((bounty) => joinedIds.includes(bounty.id)),
    [bounties, joinedIds],
  );

  const selectedBounty = useMemo(
    () => bounties.find((bounty) => bounty.id === selectedBountyId),
    [bounties, selectedBountyId],
  );

  function handleJoin(id) {
    if (!connected) {
      setLoginOpen(true);
      return;
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
  }

  function handleDareSubmission(bountyId, submission) {
    const nextSubmission = {
      id: Date.now(),
      author: profile.username || truncateAddress(fullWalletAddress),
      avatar: profile.avatar,
      text: submission.trim(),
      createdAt: "Just now",
    };

    setSubmissions((current) => ({
      ...current,
      [bountyId]: [nextSubmission, ...(current[bountyId] || [])],
    }));
  }

  function handleBountyImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setForm((current) => ({
      ...current,
      image: URL.createObjectURL(file),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    const reward = Number(form.reward);

    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (!reward || reward <= 0) nextErrors.reward = "Reward must be greater than 0.";
    if (!form.coin.trim()) nextErrors.coin = "Coin ticker is required.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nextBounty = {
      id: Date.now(),
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
      poster: fullWalletAddress,
      image: form.image,
      fundingType: form.fundingType,
    };

    setBounties((current) => [nextBounty, ...current]);
    setActiveTab("Open");
    setSelectedBountyId(nextBounty.id);
    setForm(blankForm);
    setErrors({});
    setPage("BountyDetails");
  }

  function handleLoginWithX() {
    setConnected(true);
    setLoginOpen(false);
    if (!profileComplete) {
      setPage("SetupProfile");
    }
  }

  function handleProfileImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProfile((current) => ({
      ...current,
      avatar: URL.createObjectURL(file),
    }));
  }

  function handleSetProfile(event) {
    event.preventDefault();
    if (!termsAccepted) return;
    setProfileComplete(true);
    setPage("Profile");
  }

  function handleLoginClick() {
    if (connected) {
      setConnected(false);
      return;
    }
    setLoginOpen(true);
  }

  return (
    <div className="app-background min-h-screen bg-ink font-body text-text">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/88 backdrop-blur">
        <nav className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
          <button className="inline-flex items-center" type="button" onClick={() => setPage("Explore")} aria-label="meme2earn home">
            <img className="h-10 w-auto" src="/favicon.svg" alt="" />
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex border border-line bg-surface p-1">
              {PAGES.map((navPage) => (
                <button
                  key={navPage}
                  className={`inline-flex h-9 items-center gap-2 px-3 text-sm font-bold transition ${
                    page === navPage ? "bg-pink text-ink" : "text-muted hover:bg-raised hover:text-text"
                  }`}
                  type="button"
                  onClick={() => setPage(navPage)}
                >
                  {navPage === "Explore" && <Compass size={16} />}
                  {navPage === "Create" && <Plus size={16} />}
                  {navPage === "Profile" && <User size={16} />}
                  {navPage}
                </button>
              ))}
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 border border-line bg-transparent px-4 text-sm font-medium text-text transition hover:border-pink hover:text-pink"
              type="button"
              onClick={handleLoginClick}
            >
              <User size={17} />
              {connected ? truncateAddress(fullWalletAddress) : "Login"}
            </button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {page === "Explore" && (
          <ExplorePage
            activeTab={activeTab}
            bounties={filteredBounties}
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

        {page === "BountyDetails" && selectedBounty && (
          <BountyDetailsPage
            bounty={selectedBounty}
            joined={joinedIds.includes(selectedBounty.id)}
            submissions={submissions[selectedBounty.id] || []}
            onBack={() => setPage("Explore")}
            onJoin={() => handleJoin(selectedBounty.id)}
            onSubmitDare={(submission) => handleDareSubmission(selectedBounty.id, submission)}
          />
        )}

        {page === "BountyDetails" && !selectedBounty && (
          <EmptyDetailsPage onBack={() => setPage("Explore")} />
        )}

        {page === "Create" && (
          <CreatePage
            errors={errors}
            form={form}
            onChange={setForm}
            onImageChange={handleBountyImage}
            onSubmit={handleSubmit}
          />
        )}

        {page === "SetupProfile" && (
          <SetupProfilePage
            profile={profile}
            termsAccepted={termsAccepted}
            onChange={setProfile}
            onImageChange={handleProfileImage}
            onTermsChange={setTermsAccepted}
            onSubmit={handleSetProfile}
          />
        )}

        {page === "Profile" && (
          <ProfilePage
            connected={connected}
            joinedBounties={joinedBounties}
            postedBounties={postedBounties}
            profile={profile}
            profileComplete={profileComplete}
            stats={stats}
            walletAddress={fullWalletAddress}
            onConnect={() => setLoginOpen(true)}
            onCreate={() => setPage("Create")}
            onEditProfile={() => setPage("SetupProfile")}
          />
        )}
      </main>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLoginWithX}
      />
    </div>
  );
}

function ExplorePage({
  activeTab,
  bounties,
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
          <h1 className="max-w-4xl font-display text-6xl font-bold leading-[0.95] tracking-normal text-text sm:text-7xl lg:text-8xl">
            Turn dank into bank.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Create funded meme bounties with meme coins, or join open briefs and earn for completed work.
          </p>
        </div>

        <div className="grid grid-cols-3">
          <Stat label="Open bounties" value={stats.open} />
          <Stat label="Coins in play" value={stats.coins} />
          <Stat label="Active hunters" value={stats.hunters} />
        </div>
      </section>

      <section className="py-6">
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

function CreatePage({ errors, form, onChange, onImageChange, onSubmit }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="border-b border-line pb-8 lg:border-b-0 lg:border-r lg:pr-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
          <LayoutDashboard size={16} className="text-pink" />
          Create bounty
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight text-text sm:text-6xl">Fund a brief.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted">
          Post a clear task, set the reward, and choose how many hunters can join before the bounty fills.
        </p>
        <div className="mt-8 grid grid-cols-2 border border-line bg-surface">
          <Stat label="Required fields" value={3} />
          <Stat label="Default status" value="Open" />
        </div>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
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
            <div className="grid grid-cols-[minmax(0,1fr)_8rem]">
              <input
                className="h-11 w-full border border-line bg-surface px-3 font-mono text-sm text-text"
                min="1"
                type="number"
                value={form.reward}
                onChange={(event) => onChange({ ...form, reward: event.target.value })}
              />
              <select
                className="h-11 w-full border border-l-0 border-line bg-surface px-3 font-mono text-sm font-bold text-gold"
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

function SetupProfilePage({ profile, termsAccepted, onChange, onImageChange, onTermsChange, onSubmit }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="border-b border-line pb-8 lg:border-b-0 lg:border-r lg:pr-8">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-muted">
          <User size={16} className="text-pink" />
          Set profile
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight text-text sm:text-6xl">Create your hunter profile.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted">
          Choose the name, image, and bio other users will see when you join or post bounties.
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
          <label className="inline-flex h-11 cursor-pointer items-center justify-center border border-line px-5 text-sm font-bold text-text transition hover:border-pink hover:text-pink">
            Upload profile picture
            <input className="sr-only" type="file" accept="image/*" onChange={onImageChange} />
          </label>
        </div>

        <Field label="Username">
          <input
            className="h-11 w-full border border-line bg-surface px-3 text-sm text-text"
            value={profile.username}
            onChange={(event) => onChange({ ...profile, username: event.target.value })}
          />
        </Field>

        <Field label="Bio">
          <textarea
            className="min-h-36 w-full resize-y border border-line bg-surface px-3 py-3 text-sm leading-6 text-text"
            value={profile.bio}
            onChange={(event) => onChange({ ...profile, bio: event.target.value })}
          />
        </Field>

        <div className="border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-muted">Terms and conditions</p>
          <div className="max-h-44 space-y-3 overflow-y-auto pr-3 text-sm leading-6 text-muted">
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
            onChange={(event) => onTermsChange(event.target.checked)}
          />
          <span>I have read and agree to the terms and conditions.</span>
        </label>

        <button
          className="h-12 w-full bg-pink text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
          type="submit"
          disabled={!termsAccepted}
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
  postedBounties,
  profile,
  profileComplete,
  stats,
  walletAddress,
  onConnect,
  onCreate,
  onEditProfile,
}) {
  const totalPostedRewards = postedBounties.reduce((sum, bounty) => sum + bounty.reward, 0);

  return (
    <section className="space-y-8">
      <div className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface">
            {profileComplete && profile.avatar ? (
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
          <h1 className="font-display text-5xl font-bold leading-tight text-text sm:text-6xl">
            {connected ? profile.username || truncateAddress(walletAddress) : "Wallet not connected"}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            {profileComplete && profile.bio
              ? profile.bio
              : "Track bounties you joined, briefs you posted, and basic activity from the current session."}
          </p>
          {connected && (
            <button className="mt-4 text-sm font-bold text-pink hover:text-text" type="button" onClick={onEditProfile}>
              Edit profile
            </button>
          )}
          </div>
        </div>
        <button
          className={`inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-bold transition lg:justify-self-end ${
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
      </div>

      <div className="grid border border-line bg-surface sm:grid-cols-4">
        <Stat label="Joined" value={joinedBounties.length} />
        <Stat label="Posted" value={postedBounties.length} />
        <Stat label="Open market" value={stats.open} />
        <Stat label="Posted rewards" value={totalPostedRewards ? formatReward(totalPostedRewards) : 0} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProfileList title="Joined bounties" empty="Joined bounties will appear here." bounties={joinedBounties} />
        <ProfileList title="Posted bounties" empty="Posted bounties will appear here." bounties={postedBounties} />
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
            <div className="font-mono text-lg font-bold text-pink sm:text-right">
              {formatReward(bounty.reward)} ${bounty.coin}
            </div>
          </div>
        ))
      ) : (
        <div className="border-t border-line py-10 text-sm text-muted">{empty}</div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0 border-r border-line px-4 py-1 last:border-r-0 sm:px-6">
      <p className="break-words font-mono text-3xl font-bold text-pink sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.13em] text-muted">{label}</p>
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
        <div className="font-mono text-3xl font-bold leading-none text-gold min-[860px]:text-right">
          {formatReward(bounty.reward)} ${bounty.coin}
        </div>
        <div className="hidden justify-end text-muted min-[860px]:flex">
          <ChevronRight size={22} />
        </div>
      </button>
    </article>
  );
}

function BountyDetailsPage({ bounty, joined, submissions = [], onBack, onJoin, onSubmitDare }) {
  const [submissionText, setSubmissionText] = useState("");
  const isFull = bounty.applicants >= bounty.maxApplicants;
  const canSubmit = joined && bounty.status !== "Completed";
  const urgent = bounty.daysLeft <= 3 && bounty.status !== "Completed";

  function handleSubmission(event) {
    event.preventDefault();
    if (!canSubmit || !submissionText.trim()) return;
    onSubmitDare?.(submissionText);
    setSubmissionText("");
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
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-tight text-text sm:text-6xl">{bounty.title}</h1>
        </div>

        <div className="space-y-4 min-[900px]:text-right">
          <div className="font-mono text-5xl font-bold leading-none text-gold">
            {formatReward(bounty.reward)} ${bounty.coin}
          </div>
          <div className="flex flex-wrap gap-3 min-[900px]:justify-end">
            <StatusPill status={bounty.status} />
            <Metric icon={<Clock3 size={17} />} value={bounty.status === "Completed" ? "Done" : `${bounty.daysLeft}d`} urgent={urgent} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {bounty.image ? (
            <div className="overflow-hidden border border-line bg-surface">
              <img className="max-h-[28rem] w-full object-cover" src={bounty.image} alt="" />
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Dare details</p>
            <p className="max-w-3xl text-sm leading-7 text-muted">{bounty.description}</p>
          </div>

          <div className="grid gap-4 border-y border-line py-4 sm:grid-cols-5">
            <Detail label="Poster" value={truncateAddress(bounty.poster)} />
            <Detail label="Funding" value={bounty.fundingType || "Self-Funded Dare"} />
            <Detail label="Deadline" value={bounty.deadline || "Open"} />
            <Detail label="Slots" value={`${bounty.applicants}/${bounty.maxApplicants}`} />
            <Detail label="Reward" value={`${formatReward(bounty.reward)} $${bounty.coin}`} highlight />
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Submission feed</p>
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
                    <p className="text-sm leading-6 text-muted">{submission.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t border-line py-5 text-sm text-muted">No submissions yet.</p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <HunterProgress applicants={bounty.applicants} maxApplicants={bounty.maxApplicants} />
          <button
            className="h-11 w-full bg-pink px-5 text-sm font-bold text-ink transition hover:bg-text disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted"
            type="button"
            disabled={isFull || joined || bounty.status === "Completed"}
            onClick={onJoin}
          >
            {joined ? "Joined" : isFull ? "Full" : bounty.status === "Completed" ? "Closed" : "Join bounty"}
          </button>

          {canSubmit ? (
            <form className="space-y-3" onSubmit={handleSubmission}>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">Submit your work</span>
                <textarea
                  className="min-h-32 w-full resize-y border border-line bg-surface px-3 py-3 text-sm leading-6 text-text placeholder:text-mutedFaint"
                  placeholder="Paste your link, note, or proof of completion."
                  value={submissionText}
                  onChange={(event) => setSubmissionText(event.target.value)}
                />
              </label>
              <button
                className="h-11 w-full border border-line text-sm font-bold text-text transition hover:border-pink hover:text-pink disabled:cursor-not-allowed disabled:text-mutedFaint"
                type="submit"
                disabled={!submissionText.trim()}
              >
                Submit dare
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

function Detail({ label, value, highlight = false }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.13em] text-mutedFaint">{label}</p>
      <p className={`font-mono text-sm font-bold ${highlight ? "text-gold" : "text-muted"}`}>{value}</p>
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

function LoginModal({ open, onClose, onLogin }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <div className="w-full max-w-md border border-line bg-surface p-6 shadow-2xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Login</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-text">Login with X</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center border border-line text-muted hover:text-text" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <button className="h-12 w-full bg-pink text-sm font-bold text-ink transition hover:bg-text" type="button" onClick={onLogin}>
          Login with X
        </button>
      </div>
    </div>
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




