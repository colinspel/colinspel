import { useState } from "react";
import {
  Compass, ClipboardList, User, ArrowLeft, Clock, Star, CheckCircle2,
  Plus, Users, Building2, Signal, Wifi, BatteryFull, GraduationCap,
  MapPin, Briefcase, ShieldCheck, Bell, Bookmark, Search, Send,
  MessageCircle, Check, X, Megaphone, Mail, ChevronDown, Target
} from "lucide-react";

const INK = "#12233F";
const BG = "#DCE6F2";
const SCREEN_BG = "#E9F0F9";
const CARD = "#FFFFFF";
const PRIMARY = "#1D5FD6";
const NAVY = "#12335C";
const TEAL = "#12798C";
const INDIGO = "#3B3F8C";
const STEEL = "#3B6E91";
const PRUSSIAN = "#0B4F6C";
const SLATE_BLUE = "#4A5B72";
const SLATE = "#5F6B7A";
const GREEN = "#2E8B57";
const AMBER = "#C98A1D";
const BORDER = "rgba(18,35,63,0.14)";
const DASH = "rgba(18,35,63,0.26)";

const SANS = "'Space Grotesk', sans-serif";
const MONO = "'IBM Plex Mono', monospace";

const CATEGORIES = [
  { name: "Data & Analytics", color: NAVY, band: "$300–$1,000", values: [300, 650, 1000] },
  { name: "Marketing & Growth", color: TEAL, band: "$200–$700", values: [200, 450, 700] },
  { name: "Design & Creative", color: INDIGO, band: "$200–$800", values: [200, 500, 800] },
  { name: "Writing & Content", color: STEEL, band: "$150–$600", values: [150, 375, 600] },
  { name: "Finance & Accounting", color: PRUSSIAN, band: "$300–$900", values: [300, 600, 900] },
  { name: "Business Ops", color: SLATE_BLUE, band: "$300–$900", values: [300, 600, 900] },
];

const catInfo = (name) => CATEGORIES.find((c) => c.name === name);

const PROJECTS = [
  {
    id: 1, category: "Marketing & Growth", business: "Cedar Grove Youth Soccer", verifyTier: "id",
    title: "Build a 30-day Instagram content calendar", price: 300, duration: "10 hrs",
    deadline: "Due in 12 days", software: ["Canva", "Meta Business Suite"], applicants: 6,
    rating: 4.8, reviews: 14,
    description: "We post inconsistently and don't have a plan. We need a full month of content mapped out — game highlights, player spotlights, registration pushes — with captions and posting times.",
    deliverable: "A 30-day content calendar (spreadsheet) + 5 sample designed posts.",
    recommended: true, featured: false,
    reason: "Builds content-calendar skills — used in 7 of 10 Marketing Coordinator job postings.",
  },
  {
    id: 2, category: "Writing & Content", business: "GreenLeaf Landscaping", verifyTier: "email",
    title: "Write 8 blog posts on seasonal lawn care", price: 400, duration: "14 hrs",
    deadline: "Due in 3 weeks", software: ["Google Docs", "Basic SEO"], applicants: 4,
    rating: 4.6, reviews: 9,
    description: "We want to rank locally for lawn care searches but have zero blog content. Need 8 posts, 600–800 words each, written for homeowners, with light keyword research.",
    deliverable: "8 published-ready blog posts + a one-page keyword brief.",
    recommended: true, featured: false,
    reason: "Strengthens your writing portfolio — a skill employers screen for in Marketing Coordinator roles.",
  },
  {
    id: 3, category: "Data & Analytics", business: "Northside Hardware Co.", verifyTier: "id",
    title: "Segment our customers by profitability", price: 450, duration: "15 hrs",
    deadline: "Due in 2 weeks", software: ["Excel", "SQL"], applicants: 9,
    rating: 4.9, reviews: 22,
    description: "We have 12 months of POS data and no idea which customer segments actually drive margin. Looking for a clear segmentation with a one-page summary for the owner.",
    deliverable: "Segmentation workbook + 1-page executive summary.",
    recommended: false, featured: true,
  },
  {
    id: 4, category: "Design & Creative", business: "Riverbend Farmers Market", verifyTier: "email",
    title: "Refresh our logo and market signage", price: 350, duration: "12 hrs",
    deadline: "Due in 3 weeks", software: ["Figma", "Illustrator"], applicants: 7,
    rating: 4.7, reviews: 11,
    description: "Our logo hasn't changed since 2009. We need a clean refresh plus 3 signs we can print for market day (welcome sign, vendor map, hours board).",
    deliverable: "Logo files + 3 print-ready signs.",
    recommended: false, featured: false,
  },
  {
    id: 5, category: "Finance & Accounting", business: "Corner Bakery", verifyTier: "id",
    title: "Clean up 6 months of bookkeeping", price: 500, duration: "16 hrs",
    deadline: "Due in 10 days", software: ["QuickBooks", "Excel"], applicants: 5,
    rating: 4.9, reviews: 17,
    description: "Our books are messy after a busy season. Need transactions categorized correctly and a simple monthly budget tracker set up going forward.",
    deliverable: "Reconciled QuickBooks file + budget tracker template.",
    recommended: false, featured: false,
  },
];

const APPLICATIONS = [
  { project: PROJECTS[0], status: "Verified" },
  { project: PROJECTS[2], status: "In progress" },
  { project: PROJECTS[4], status: "Applied" },
];

const STATUS_STYLE = {
  Applied: { color: SLATE, label: "APPLIED" },
  "In progress": { color: PRIMARY, label: "IN PROGRESS" },
  Submitted: { color: AMBER, label: "SUBMITTED" },
  Verified: { color: GREEN, label: "VERIFIED" },
};

const APPLICANTS = [
  {
    name: "Maya Okonkwo", major: "Marketing, Junior", match: 92, skills: ["Canva", "Content strategy"], rating: 4.9, reviews: 5,
    pitch: "I grew our club's Instagram from 400 to 2,200 followers this year — happy to bring that playbook here.",
  },
  {
    name: "Diego Fuentes", major: "Communications, Sophomore", match: 84, skills: ["Copywriting", "Meta Ads"], rating: 4.6, reviews: 2,
    pitch: "I've built content calendars for two campus clubs and know how to keep a consistent posting cadence.",
  },
  {
    name: "Priya Shah", major: "Business, Senior", match: 78, skills: ["Canva", "Analytics"], rating: 5.0, reviews: 8,
    pitch: "Analytics is my focus, but I coached rec soccer for three years — I get your audience.",
  },
];

const NOTIFICATIONS = [
  { id: 1, text: "Cedar Grove Youth Soccer approved your application", time: "2h ago", unread: true },
  { id: 2, text: "Payment released — $450 for Customer segmentation", time: "1d ago", unread: true },
  { id: 3, text: "New message from GreenLeaf Landscaping", time: "2d ago", unread: false },
  { id: 4, text: "Northside Hardware Co. left you a 5-star review", time: "4d ago", unread: false },
];

const CONVERSATIONS = [
  {
    id: 1, name: "Cedar Grove Youth Soccer", verifyTier: "id", project: "Instagram content calendar",
    last: "Looks great — can you add posting times?", time: "10:24 AM", unread: true,
    thread: [
      { from: "them", text: "Hi Jordan! Excited to work with you on this." },
      { from: "me", text: "Thanks, I'll have a first draft over by Friday." },
      { from: "them", text: "Looks great — can you add posting times?" },
    ],
  },
  {
    id: 2, name: "GreenLeaf Landscaping", verifyTier: "email", project: "Seasonal blog posts",
    last: "Sent over the keyword list, take a look when you can.", time: "Yesterday", unread: false,
    thread: [
      { from: "them", text: "Sent over the keyword list, take a look when you can." },
      { from: "me", text: "Got it, starting on the first draft today." },
    ],
  },
  {
    id: 3, name: "Northside Hardware Co.", verifyTier: "id", project: "Customer segmentation",
    last: "Payment has been released. Thank you!", time: "Mon", unread: false,
    thread: [
      { from: "them", text: "This is exactly what we needed, thank you." },
      { from: "them", text: "Payment has been released. Thank you!" },
    ],
  },
];

function VerifiedTag({ tier = "email" }) {
  if (tier === "id") {
    return (
      <span className="flex items-center gap-1 text-xs" style={{ color: GREEN, fontFamily: SANS }}>
        <ShieldCheck size={13} color={GREEN} /> ID verified
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: SLATE, fontFamily: SANS }}>
      <Mail size={13} color={SLATE} /> Email verified
    </span>
  );
}

function EmptyState({ category }) {
  const [notify, setNotify] = useState(false);
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <Search size={20} color={SLATE} />
      </div>
      <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>No {category} projects yet</p>
      <p className="text-xs mt-1 mb-4" style={{ color: SLATE, fontFamily: SANS, maxWidth: "220px" }}>
        We'll let you know the moment a business posts one in this category.
      </p>
      <button
        onClick={() => setNotify(true)}
        className="px-4 py-2 rounded-md text-xs font-semibold"
        style={{ backgroundColor: notify ? GREEN : PRIMARY, color: "#fff", fontFamily: SANS }}
      >
        {notify ? "You're on the list ✓" : "Notify me"}
      </button>
    </div>
  );
}

function RatingLine({ score, count }) {
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: SLATE, fontFamily: SANS }}>
      <Star size={12} fill={AMBER} color={AMBER} />
      <span style={{ fontFamily: MONO, color: INK }}>{score}</span> ({count})
    </span>
  );
}

function StampBadge({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <div
      className="absolute -top-2 -right-2 px-2 py-1 text-xs font-semibold bg-white"
      style={{ color: s.color, border: `2px solid ${s.color}`, fontFamily: MONO, transform: "rotate(6deg)", letterSpacing: "0.04em" }}
    >
      {s.label}
    </div>
  );
}

function Chip({ children, color = INK }) {
  return (
    <span className="px-2.5 py-1 text-xs rounded-full inline-block" style={{ fontFamily: SANS, color, border: `1px solid ${color}` }}>
      {children}
    </span>
  );
}

function Toggle({ enabled, onClick }) {
  return (
    <button onClick={onClick} className="w-10 h-6 rounded-full relative flex-shrink-0" style={{ backgroundColor: enabled ? PRIMARY : BORDER }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: enabled ? 18 : 2, transition: "left 0.15s" }} />
    </button>
  );
}

function FeatureRow({ label, included }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {included ? <Check size={15} color={GREEN} /> : <X size={15} color="#B7C2D0" />}
      <span className="text-sm" style={{ color: included ? INK : SLATE, fontFamily: SANS }}>{label}</span>
    </div>
  );
}

function TicketCard({ project, onClick, showStamp, saved, onToggleSave }) {
  const color = catInfo(project.category).color;
  return (
    <div className="w-full relative mb-3" style={{ fontFamily: SANS }}>
      {showStamp && <StampBadge status={showStamp} />}
      <button onClick={onClick} className="w-full text-left rounded-md overflow-hidden block" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <div className="px-3 py-1.5 flex items-center justify-between gap-2" style={{ backgroundColor: color }}>
          <span className="text-xs font-semibold text-white truncate">{project.category}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {project.recommended && !project.featured && (
              <span className="text-xs text-white flex items-center gap-1">
                <Star size={11} fill="white" /> Matches your path
              </span>
            )}
            {project.featured && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: AMBER, color: INK }}>
                <Megaphone size={10} /> Featured
              </span>
            )}
            {onToggleSave && (
              <span onClick={(e) => { e.stopPropagation(); onToggleSave(project.id); }}>
                <Bookmark size={15} color="white" fill={saved ? "white" : "none"} />
              </span>
            )}
          </div>
        </div>
        <div className="px-3.5 py-3">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: INK }}>{project.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs" style={{ color: SLATE }}>{project.business}</p>
            <RatingLine score={project.rating} count={project.reviews} />
          </div>
          {project.recommended && project.reason && (
            <p className="text-xs mt-1.5 flex items-start gap-1" style={{ color: PRIMARY, fontFamily: SANS }}>
              <Target size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {project.reason}
            </p>
          )}
          <div className="my-2.5" style={{ borderTop: `1.5px dashed ${DASH}` }} />
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold" style={{ fontFamily: MONO, color: INK }}>${project.price}</span>
            <span className="text-xs flex items-center gap-1" style={{ color: SLATE, fontFamily: MONO }}>
              <Clock size={12} /> {project.duration}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1" style={{ color: INK, fontFamily: MONO }}>
      <span className="text-xs font-medium">9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal size={13} /><Wifi size={13} /><BatteryFull size={15} />
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack, onBell, unread }) {
  return (
    <div className="px-4 pt-2 pb-3 flex items-center gap-2 justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1"><ArrowLeft size={19} color={INK} /></button>
        )}
        <h1 className="text-lg font-semibold" style={{ fontFamily: SANS, color: INK }}>{title}</h1>
      </div>
      {onBell && (
        <button onClick={onBell} className="relative p-1">
          <Bell size={18} color={INK} />
          {unread && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#D64545" }} />}
        </button>
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 flex-1 py-2">
      <Icon size={19} color={active ? PRIMARY : SLATE} strokeWidth={active ? 2.4 : 1.8} />
      <span className="text-xs" style={{ fontFamily: SANS, color: active ? PRIMARY : SLATE }}>{label}</span>
    </button>
  );
}

export default function App() {
  const [role, setRole] = useState("student");
  const [studentScreen, setStudentScreen] = useState("discover");
  const [businessScreen, setBusinessScreen] = useState("post");
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [postCategory, setPostCategory] = useState(null);
  const [budget, setBudget] = useState(null);
  const [boost, setBoost] = useState(false);
  const [saved, setSaved] = useState([]);
  const [thread, setThread] = useState(null);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  const filtered = activeCategory === "All" ? PROJECTS : PROJECTS.filter((p) => p.category === activeCategory);
  const unreadNotif = NOTIFICATIONS.some((n) => n.unread);

  function openProject(p) {
    setSelectedProject(p); setStudentScreen("detail");
    setAgreementChecked(false); setApplicationSubmitted(false);
  }
  function toggleSave(id) { setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  function openThread(c) { setThread(c); if (role === "student") setStudentScreen("thread"); else setBusinessScreen("thread"); }
  function pickCategory(c) { setPostCategory(c.name); setBudget(c.values[1]); setBoost(false); setShowFeeDetails(false); }
  function switchRole(r) {
    setRole(r); setSelectedProject(null); setThread(null);
    setStudentScreen("discover"); setBusinessScreen("post");
  }

  const screenBody = () => {
    if (role === "student") {
      if (studentScreen === "discover") return <Discover />;
      if (studentScreen === "detail") return <Detail />;
      if (studentScreen === "agreement") return <Agreement />;
      if (studentScreen === "applications") return <Applications />;
      if (studentScreen === "messages") return <Messages />;
      if (studentScreen === "thread") return <Thread back={() => setStudentScreen("messages")} />;
      if (studentScreen === "profile") return <StudentProfile />;
      if (studentScreen === "premium") return <Premium />;
      if (studentScreen === "notifications") return <Notifications back={() => setStudentScreen("discover")} />;
    } else {
      if (businessScreen === "post") return <PostProject />;
      if (businessScreen === "applicants") return <Applicants />;
      if (businessScreen === "messages") return <Messages />;
      if (businessScreen === "thread") return <Thread back={() => setBusinessScreen("messages")} />;
      if (businessScreen === "profile") return <BusinessProfile />;
      if (businessScreen === "plans") return <Plans />;
      if (businessScreen === "notifications") return <Notifications back={() => setBusinessScreen("post")} />;
    }
  };

  function Discover() {
    const recommended = PROJECTS.filter((p) => p.recommended && !p.featured);
    const featured = PROJECTS.filter((p) => p.featured);
    return (
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 pt-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <Search size={15} color={SLATE} />
            <span className="text-sm" style={{ color: SLATE, fontFamily: SANS }}>Search projects</span>
          </div>
          <button onClick={() => setStudentScreen("notifications")} className="relative p-2 rounded-md" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <Bell size={17} color={INK} />
            {unreadNotif && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: "#D64545" }} />}
          </button>
        </div>
        <div className="pt-3 pb-2">
          <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Target career path</p>
          <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Marketing Coordinator</p>
        </div>
        {recommended.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>Recommended to build your portfolio</p>
            {recommended.map((p) => (
              <TicketCard key={p.id} project={p} onClick={() => openProject(p)} saved={saved.includes(p.id)} onToggleSave={toggleSave} />
            ))}
          </div>
        )}
        {featured.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold flex items-center gap-1" style={{ color: SLATE, fontFamily: SANS }}>
                <Megaphone size={12} color={AMBER} /> Featured listings
              </p>
              <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Sponsored placement</p>
            </div>
            {featured.map((p) => (
              <TicketCard key={p.id} project={p} onClick={() => openProject(p)} saved={saved.includes(p.id)} onToggleSave={toggleSave} />
            ))}
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1">
          {["All", ...CATEGORIES.map((c) => c.name)].map((name) => {
            const info = catInfo(name);
            const activeColor = name === "All" ? INK : info.color;
            const isActive = name === activeCategory;
            return (
              <button
                key={name} onClick={() => setActiveCategory(name)}
                className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0"
                style={{ fontFamily: SANS, border: `1px solid ${isActive ? activeColor : BORDER}`, backgroundColor: isActive ? activeColor : "transparent", color: isActive ? "#fff" : INK }}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>All open projects</p>
        {filtered.length === 0 ? (
          <EmptyState category={activeCategory} />
        ) : (
          filtered.map((p) => (
            <TicketCard key={p.id} project={p} onClick={() => openProject(p)} saved={saved.includes(p.id)} onToggleSave={toggleSave} />
          ))
        )}
      </div>
    );
  }

  function Detail() {
    const p = selectedProject || PROJECTS[0];
    const color = catInfo(p.category).color;
    return (
      <>
        <ScreenHeader title="Project" onBack={() => setStudentScreen("discover")} />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="rounded-md overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: color }}>
              <span className="text-xs font-semibold text-white">{p.category}</span>
              <div className="flex items-center gap-2">
                {p.featured && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: AMBER, color: INK }}>
                    <Megaphone size={10} /> Featured
                  </span>
                )}
                <span onClick={() => toggleSave(p.id)}><Bookmark size={16} color="white" fill={saved.includes(p.id) ? "white" : "none"} /></span>
              </div>
            </div>
            <div className="px-4 py-4">
              <h2 className="text-base font-semibold" style={{ fontFamily: SANS, color: INK }}>{p.title}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <p className="text-xs flex items-center gap-1" style={{ color: SLATE, fontFamily: SANS }}><Building2 size={12} /> {p.business}</p>
                <RatingLine score={p.rating} count={p.reviews} />
                <VerifiedTag tier={p.verifyTier} />
              </div>

              <div className="my-3" style={{ borderTop: `1.5px dashed ${DASH}` }} />

              {p.recommended && p.reason && (
                <div className="rounded-md p-3 mb-3 flex items-start gap-2" style={{ backgroundColor: "rgba(29,95,214,0.08)", border: `1px solid ${BORDER}` }}>
                  <Target size={14} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: PRIMARY, fontFamily: SANS }}>Why this fits your path</p>
                    <p className="text-xs mt-0.5" style={{ color: INK, fontFamily: SANS }}>{p.reason}</p>
                  </div>
                </div>
              )}

              <p className="text-xs font-semibold mb-1" style={{ color: SLATE, fontFamily: SANS }}>Scope</p>
              <p className="text-sm leading-relaxed" style={{ color: INK, fontFamily: SANS }}>{p.description}</p>

              <p className="text-xs font-semibold mt-4 mb-1" style={{ color: SLATE, fontFamily: SANS }}>Deliverable</p>
              <p className="text-sm leading-relaxed" style={{ color: INK, fontFamily: SANS }}>{p.deliverable}</p>

              <p className="text-xs font-semibold mt-4 mb-2" style={{ color: SLATE, fontFamily: SANS }}>Tools</p>
              <div className="flex gap-2 flex-wrap">{p.software.map((s) => <Chip key={s} color={color}>{s}</Chip>)}</div>

              <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-md" style={{ backgroundColor: "rgba(29,95,214,0.06)", border: `1px solid ${BORDER}` }}>
                <ShieldCheck size={14} color={PRIMARY} />
                <span className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Protected by ProjectMatch's data & IP agreement</span>
              </div>

              <div className="my-4" style={{ borderTop: `1.5px dashed ${DASH}` }} />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Budget</p>
                  <p className="text-xl font-semibold" style={{ fontFamily: MONO, color: INK }}>${p.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Estimated time</p>
                  <p className="text-sm font-semibold" style={{ fontFamily: MONO, color: INK }}>{p.duration}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs" style={{ color: SLATE, fontFamily: MONO }}>{p.deadline}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: SLATE, fontFamily: SANS }}><Users size={12} /> {p.applicants} students applied</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setStudentScreen("agreement")}
            className="w-full mt-4 py-3 rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: PRIMARY, fontFamily: SANS }}
          >
            Apply for this project
          </button>
        </div>
      </>
    );
  }

  function Agreement() {
    const p = selectedProject || PROJECTS[0];
    return (
      <>
        <ScreenHeader title="Project agreement" onBack={() => setStudentScreen("detail")} />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm mb-4" style={{ color: INK, fontFamily: SANS }}>
            Before you apply to <span style={{ fontFamily: MONO }}>{p.title}</span>, {p.business} asks every applicant to agree to these terms.
          </p>

          <div className="rounded-md p-3 mb-3 flex items-start gap-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <ShieldCheck size={18} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Data & confidentiality</p>
              <p className="text-xs mt-0.5" style={{ color: SLATE, fontFamily: SANS }}>Any business data you access stays confidential and is deleted once the project closes.</p>
            </div>
          </div>

          <div className="rounded-md p-3 mb-3 flex items-start gap-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <Briefcase size={18} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>IP ownership</p>
              <p className="text-xs mt-0.5" style={{ color: SLATE, fontFamily: SANS }}>The approved deliverable belongs to {p.business}. Keep a copy for your portfolio with their permission.</p>
            </div>
          </div>

          <div className="rounded-md p-3 mb-4 flex items-start gap-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <CheckCircle2 size={18} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Dispute resolution</p>
              <p className="text-xs mt-0.5" style={{ color: SLATE, fontFamily: SANS }}>If something isn't right, ProjectMatch mediates before any payment is released.</p>
            </div>
          </div>

          {applicationSubmitted ? (
            <div className="rounded-md p-4 flex items-center gap-2" style={{ backgroundColor: "rgba(46,139,87,0.1)", border: `1px solid ${GREEN}` }}>
              <CheckCircle2 size={18} color={GREEN} />
              <span className="text-sm font-semibold" style={{ color: GREEN, fontFamily: SANS }}>Application submitted</span>
            </div>
          ) : (
            <>
              <button onClick={() => setAgreementChecked(!agreementChecked)} className="w-full flex items-start gap-3 mb-4 text-left">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ border: `1.5px solid ${agreementChecked ? PRIMARY : BORDER}`, backgroundColor: agreementChecked ? PRIMARY : "transparent" }}
                >
                  {agreementChecked && <Check size={13} color="white" />}
                </span>
                <span className="text-sm" style={{ color: INK, fontFamily: SANS }}>I've read and agree to the project agreement above.</span>
              </button>
              <button
                onClick={() => agreementChecked && setApplicationSubmitted(true)}
                className="w-full py-3 rounded-md text-sm font-semibold text-white"
                style={{ backgroundColor: agreementChecked ? PRIMARY : "#B7C2D0", fontFamily: SANS }}
              >
                Submit application
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  function Applications() {
    return (
      <>
        <ScreenHeader title="Your projects" onBell={() => setStudentScreen("notifications")} unread={unreadNotif} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          {APPLICATIONS.map((a) => (
            <TicketCard key={a.project.id} project={a.project} showStamp={a.status} onClick={() => {}} />
          ))}
        </div>
      </>
    );
  }

  function Messages() {
    return (
      <>
        <ScreenHeader title="Messages" onBell={() => (role === "student" ? setStudentScreen("notifications") : setBusinessScreen("notifications"))} unread={unreadNotif} />
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {CONVERSATIONS.map((c) => (
            <button key={c.id} onClick={() => openThread(c)} className="w-full text-left flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ backgroundColor: NAVY, fontFamily: SANS }}>
                {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate" style={{ color: INK, fontFamily: SANS }}>{c.name}</p>
                  {c.verifyTier === "id" ? <ShieldCheck size={12} color={GREEN} /> : <Mail size={12} color={SLATE} />}
                </div>
                <p className="text-xs truncate" style={{ color: SLATE, fontFamily: SANS }}>{c.last}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs" style={{ color: SLATE, fontFamily: MONO }}>{c.time}</p>
                {c.unread && <span className="inline-block w-2 h-2 rounded-full mt-1" style={{ backgroundColor: PRIMARY }} />}
              </div>
            </button>
          ))}
        </div>
      </>
    );
  }

  function Thread({ back }) {
    const c = thread || CONVERSATIONS[0];
    return (
      <>
        <ScreenHeader title={c.name} onBack={back} />
        <div className="px-4 pt-2 pb-1">
          <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Re: {c.project}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">
          {c.thread.map((m, i) => (
            <div key={i} className={`max-w-[75%] px-3 py-2 rounded-md text-sm ${m.from === "me" ? "self-end" : "self-start"}`}
              style={{ backgroundColor: m.from === "me" ? PRIMARY : CARD, color: m.from === "me" ? "#fff" : INK, border: m.from === "me" ? "none" : `1px solid ${BORDER}`, fontFamily: SANS }}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex-1 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: SLATE, fontFamily: SANS }}>
            Message...
          </div>
          <button className="p-2.5 rounded-md" style={{ backgroundColor: PRIMARY }}><Send size={15} color="white" /></button>
        </div>
      </>
    );
  }

  function Notifications({ back }) {
    return (
      <>
        <ScreenHeader title="Notifications" onBack={back} />
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {NOTIFICATIONS.map((n) => (
            <div key={n.id} className="flex items-start gap-3 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.unread ? PRIMARY : "transparent" }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: INK, fontFamily: SANS }}>{n.text}</p>
                <p className="text-xs mt-0.5" style={{ color: SLATE, fontFamily: MONO }}>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  function StudentProfile() {
    return (
      <>
        <ScreenHeader title="Profile" onBell={() => setStudentScreen("notifications")} unread={unreadNotif} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold" style={{ backgroundColor: NAVY, fontFamily: SANS }}>JT</div>
            <div>
              <p className="font-semibold text-sm" style={{ color: INK, fontFamily: SANS }}>Jordan Tran</p>
              <p className="text-xs flex items-center gap-1" style={{ color: SLATE, fontFamily: SANS }}><GraduationCap size={12} /> Marketing, Junior</p>
              <div className="flex items-center gap-3 mt-1">
                <RatingLine score={4.9} count={21} /><VerifiedTag tier="email" />
              </div>
            </div>
          </div>

          <button onClick={() => setStudentScreen("premium")} className="w-full rounded-md p-3 mb-4 flex items-center justify-between" style={{ backgroundColor: PRIMARY }}>
            <div className="text-left">
              <p className="text-sm font-semibold text-white" style={{ fontFamily: SANS }}>Go Premium</p>
              <p className="text-xs" style={{ color: "#DCE8FF", fontFamily: SANS }}>Priority matching, interview prep & more</p>
            </div>
            <span className="text-xs font-semibold text-white" style={{ fontFamily: MONO }}>$9.99/mo</span>
          </button>

          <div className="rounded-md p-3 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Target career path</p>
            <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Marketing Coordinator</p>
          </div>

          <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>Skills</p>
          <div className="flex gap-2 flex-wrap mb-4">{["Content strategy", "Social analytics", "Copywriting"].map((s) => <Chip key={s} color={PRIMARY}>{s}</Chip>)}</div>

          <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>Software</p>
          <div className="flex gap-2 flex-wrap mb-4">{["Canva", "Meta Business Suite", "Google Analytics"].map((s) => <Chip key={s} color={NAVY}>{s}</Chip>)}</div>

          <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>Portfolio</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-md flex items-center justify-center" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <Briefcase size={18} color={SLATE} />
              </div>
            ))}
          </div>
          <p className="text-xs font-semibold mb-1" style={{ color: SLATE, fontFamily: SANS }}>Availability</p>
          <p className="text-sm" style={{ color: INK, fontFamily: SANS }}>8–10 hrs/week, evenings and weekends</p>
        </div>
      </>
    );
  }

  function Premium() {
    return (
      <>
        <ScreenHeader title="Go Premium" onBack={() => setStudentScreen("profile")} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div className="rounded-md p-4 mb-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-semibold mb-2" style={{ color: INK, fontFamily: SANS }}>Free</p>
            <FeatureRow label="Apply to projects" included />
            <FeatureRow label="Basic profile & portfolio" included />
            <FeatureRow label="Career-path recommendations" included />
            <FeatureRow label="Priority matching" included={false} />
            <FeatureRow label="AI resume optimization" included={false} />
            <FeatureRow label="Interview prep sessions" included={false} />
          </div>
          <div className="rounded-md p-4 mb-4" style={{ backgroundColor: CARD, border: `2px solid ${PRIMARY}` }}>
            <p className="text-sm font-semibold mb-2" style={{ color: PRIMARY, fontFamily: SANS }}>Premium</p>
            <FeatureRow label="Everything in Free" included />
            <FeatureRow label="Priority matching — seen first" included />
            <FeatureRow label="AI resume optimization" included />
            <FeatureRow label="Advanced portfolio builder" included />
            <FeatureRow label="Interview prep sessions" included />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-semibold" style={{ fontFamily: MONO, color: INK }}>$9.99/mo</span>
            </div>
          </div>
          <button className="w-full py-3 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY, fontFamily: SANS }}>Upgrade to Premium</button>
        </div>
      </>
    );
  }

  function PostProject() {
    const info = postCategory ? catInfo(postCategory) : null;
    const fee = budget ? Math.round(budget * 0.15) : 0;
    const total = (budget || 0) + fee + (boost ? 25 : 0);
    return (
      <>
        <ScreenHeader title="Post a project" onBell={() => setBusinessScreen("notifications")} unread={unreadNotif} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: SLATE, fontFamily: SANS }}>Category</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button key={c.name} onClick={() => pickCategory(c)} className="rounded-md p-2.5 text-left"
                style={{ border: `1.5px solid ${postCategory === c.name ? c.color : BORDER}`, backgroundColor: postCategory === c.name ? c.color : CARD }}>
                <span className="text-xs font-semibold block" style={{ color: postCategory === c.name ? "#fff" : INK, fontFamily: SANS }}>{c.name}</span>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold mb-1" style={{ color: SLATE, fontFamily: SANS }}>Project title</p>
          <div className="mb-3 px-3 py-2.5 rounded-md text-sm" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: SLATE, fontFamily: SANS }}>
            e.g. Build a customer email welcome series
          </div>

          <p className="text-xs font-semibold mb-1" style={{ color: SLATE, fontFamily: SANS }}>What do you need done?</p>
          <div className="mb-3 px-3 py-2.5 rounded-md text-sm h-20" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, color: SLATE, fontFamily: SANS }}>
            Describe the problem, not just the task — students match better to context.
          </div>

          {info && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: SLATE, fontFamily: SANS }}>
                Budget <span style={{ color: SLATE, fontFamily: MONO }}>(typical: {info.band})</span>
              </p>
              <div className="flex gap-2 mb-4">
                {info.values.map((v) => (
                  <button key={v} onClick={() => setBudget(v)} className="flex-1 py-2 rounded-md text-sm font-semibold"
                    style={{ border: `1.5px solid ${budget === v ? PRIMARY : BORDER}`, backgroundColor: budget === v ? PRIMARY : CARD, color: budget === v ? "#fff" : INK, fontFamily: MONO }}>
                    ${v}
                  </button>
                ))}
              </div>

              <div className="rounded-md p-3 mb-4 flex items-center justify-between" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Feature this project</p>
                  <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Top of feed for 7 days — $25</p>
                </div>
                <Toggle enabled={boost} onClick={() => setBoost(!boost)} />
              </div>

              <div className="rounded-md p-3 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ fontFamily: SANS, color: INK }}>Total to hire</span>
                  <span className="text-lg font-semibold" style={{ fontFamily: MONO, color: INK }}>${total}</span>
                </div>
                <button onClick={() => setShowFeeDetails(!showFeeDetails)} className="flex items-center gap-1 mt-1">
                  <span className="text-xs" style={{ color: PRIMARY, fontFamily: SANS }}>{showFeeDetails ? "Hide details" : "Show details"}</span>
                  <ChevronDown size={13} color={PRIMARY} style={{ transform: showFeeDetails ? "rotate(180deg)" : "none" }} />
                </button>
                {showFeeDetails && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1.5px dashed ${DASH}` }}>
                    <div className="flex justify-between text-sm mb-1" style={{ fontFamily: SANS, color: INK }}>
                      <span>Project budget (to student)</span><span style={{ fontFamily: MONO }}>${budget}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1" style={{ fontFamily: SANS, color: SLATE }}>
                      <span>Platform fee (15%)</span><span style={{ fontFamily: MONO }}>${fee}</span>
                    </div>
                    {boost && (
                      <div className="flex justify-between text-sm" style={{ fontFamily: SANS, color: SLATE }}>
                        <span>Boost — featured 7 days</span><span style={{ fontFamily: MONO }}>$25</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: SLATE, fontFamily: SANS }}>Held securely until you approve the final deliverable.</p>
              </div>
            </>
          )}

          <button className="w-full py-3 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY, fontFamily: SANS }}>Post project</button>
        </div>
      </>
    );
  }

  function Applicants() {
    return (
      <>
        <ScreenHeader title="Applicants" onBell={() => setBusinessScreen("notifications")} unread={unreadNotif} />
        <div className="px-4 pt-3">
          <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>For:</p>
          <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>Build a 30-day Instagram content calendar</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
          {APPLICANTS.map((a) => (
            <div key={a.name} className="rounded-md p-3 mb-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold" style={{ color: INK, fontFamily: SANS }}>{a.name}</p>
                  <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>{a.major}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: GREEN, fontFamily: MONO }}>{a.match}%</p>
                  <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>match</p>
                </div>
              </div>
              <RatingLine score={a.rating} count={a.reviews} />
              <div className="pl-2 my-2" style={{ borderLeft: `2px solid ${PRIMARY}` }}>
                <p className="text-xs leading-snug" style={{ color: INK, fontFamily: SANS }}>"{a.pitch}"</p>
              </div>
              <div className="flex gap-2 flex-wrap my-2">{a.skills.map((s) => <Chip key={s} color={PRIMARY}>{s}</Chip>)}</div>
              <div className="flex gap-2 mt-1">
                <button className="flex-1 py-2 rounded-md text-xs font-semibold" style={{ border: `1px solid ${INK}`, color: INK, fontFamily: SANS }}>View profile</button>
                <button className="flex-1 py-2 rounded-md text-xs font-semibold text-white" style={{ backgroundColor: PRIMARY, fontFamily: SANS }}>Select</button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  function BusinessProfile() {
    return (
      <>
        <ScreenHeader title="Business profile" onBell={() => setBusinessScreen("notifications")} unread={unreadNotif} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: TEAL }}><Building2 size={22} /></div>
            <div>
              <p className="font-semibold text-sm" style={{ color: INK, fontFamily: SANS }}>Cedar Grove Youth Soccer</p>
              <p className="text-xs flex items-center gap-1" style={{ color: SLATE, fontFamily: SANS }}><MapPin size={12} /> Cedar Grove, NJ</p>
              <div className="flex items-center gap-3 mt-1"><RatingLine score={4.8} count={14} /><VerifiedTag tier="id" /></div>
            </div>
          </div>

          <button onClick={() => setBusinessScreen("plans")} className="w-full rounded-md p-3 mb-4 flex items-center justify-between" style={{ backgroundColor: PRIMARY }}>
            <div className="text-left">
              <p className="text-sm font-semibold text-white" style={{ fontFamily: SANS }}>Business plan</p>
              <p className="text-xs" style={{ color: "#DCE8FF", fontFamily: SANS }}>3 active projects, screening & analytics</p>
            </div>
            <span className="text-xs font-semibold text-white" style={{ fontFamily: MONO }}>$99/mo</span>
          </button>

          <div className="rounded-md p-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: SLATE, fontFamily: SANS }}>Projects posted</p>
            <p className="text-sm font-semibold" style={{ color: INK, fontFamily: MONO }}>4 total · 3 completed</p>
          </div>
        </div>
      </>
    );
  }

  function Plans() {
    return (
      <>
        <ScreenHeader title="Business plans" onBack={() => setBusinessScreen("profile")} />
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div className="rounded-md p-4 mb-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-sm font-semibold mb-2" style={{ color: INK, fontFamily: SANS }}>Free</p>
            <FeatureRow label="1 active project" included />
            <FeatureRow label="Standard project posting" included />
            <FeatureRow label="Candidate screening" included={false} />
            <FeatureRow label="Project templates" included={false} />
            <FeatureRow label="Analytics dashboard" included={false} />
          </div>
          <div className="rounded-md p-4 mb-4" style={{ backgroundColor: CARD, border: `2px solid ${PRIMARY}` }}>
            <p className="text-sm font-semibold mb-2" style={{ color: PRIMARY, fontFamily: SANS }}>Business</p>
            <FeatureRow label="3 active projects" included />
            <FeatureRow label="Candidate screening" included />
            <FeatureRow label="Project templates" included />
            <FeatureRow label="Analytics dashboard" included />
            <FeatureRow label="Priority support" included />
            <div className="mt-3"><span className="text-lg font-semibold" style={{ fontFamily: MONO, color: INK }}>$99/mo</span></div>
          </div>
          <button className="w-full py-3 rounded-md text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY, fontFamily: SANS }}>Upgrade to Business</button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-8 px-4" style={{ backgroundColor: BG }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

      <div className="mb-1 flex items-baseline gap-0.5">
        <span className="text-2xl font-bold" style={{ fontFamily: SANS, color: INK }}>Project</span>
        <span className="text-2xl font-bold" style={{ fontFamily: SANS, color: PRIMARY }}>Match</span>
      </div>
      <p className="text-xs mb-5" style={{ color: SLATE, fontFamily: SANS }}>App design prototype</p>

      <div className="flex mb-6 rounded-full p-1" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <button onClick={() => switchRole("student")} className="px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{ fontFamily: SANS, backgroundColor: role === "student" ? PRIMARY : "transparent", color: role === "student" ? "#fff" : INK }}>
          Student view
        </button>
        <button onClick={() => switchRole("business")} className="px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{ fontFamily: SANS, backgroundColor: role === "business" ? PRIMARY : "transparent", color: role === "business" ? "#fff" : INK }}>
          Business view
        </button>
      </div>

      <div className="relative shadow-2xl" style={{ width: 380, borderRadius: 44, backgroundColor: INK, padding: 12 }}>
        <div className="flex flex-col overflow-hidden" style={{ width: 356, height: 720, borderRadius: 34, backgroundColor: SCREEN_BG }}>
          <StatusBar />
          {screenBody()}
          <div className="flex" style={{ borderTop: `1px solid ${BORDER}`, backgroundColor: CARD }}>
            {role === "student" ? (
              <>
                <NavButton icon={Compass} label="Discover" active={studentScreen === "discover" || studentScreen === "detail" || studentScreen === "agreement"} onClick={() => setStudentScreen("discover")} />
                <NavButton icon={ClipboardList} label="Projects" active={studentScreen === "applications"} onClick={() => setStudentScreen("applications")} />
                <NavButton icon={MessageCircle} label="Messages" active={studentScreen === "messages" || studentScreen === "thread"} onClick={() => setStudentScreen("messages")} />
                <NavButton icon={User} label="Profile" active={studentScreen === "profile" || studentScreen === "premium"} onClick={() => setStudentScreen("profile")} />
              </>
            ) : (
              <>
                <NavButton icon={Plus} label="Post" active={businessScreen === "post"} onClick={() => setBusinessScreen("post")} />
                <NavButton icon={Users} label="Applicants" active={businessScreen === "applicants"} onClick={() => setBusinessScreen("applicants")} />
                <NavButton icon={MessageCircle} label="Messages" active={businessScreen === "messages" || businessScreen === "thread"} onClick={() => setBusinessScreen("messages")} />
                <NavButton icon={Building2} label="Profile" active={businessScreen === "profile" || businessScreen === "plans"} onClick={() => setBusinessScreen("profile")} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
