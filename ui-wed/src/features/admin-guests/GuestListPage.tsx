import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import Eyebrow from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { logout as logoutRequest } from "../auth/auth.api";
import CampaignsSection from "../campaigns/CampaignsSection";
import WeddingSettingsSection from "../wedding-settings/WeddingSettingsSection";
import GuestListSection from "./GuestListSection";

type Tab = "guests" | "campaigns" | "wedding";

const TABS: { key: Tab; label: string }[] = [
  { key: "guests", label: "Guest List" },
  { key: "campaigns", label: "Campaigns" },
  { key: "wedding", label: "Wedding Schedule" },
];

// The couple's one admin console: guest list/CSV, email campaigns, and the
// wedding schedule all live behind this single route, switched by an
// in-page tab rather than separate routes -- there's exactly one admin, so
// a shared nav shell (à la a multi-route AdminLayout) buys nothing here
// that this simpler tab switcher doesn't already cover.
function GuestListPage() {
  const [tab, setTab] = useState<Tab>("guests");
  const { markAnonymous } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logoutRequest().catch(() => {});
    markAnonymous();
    navigate("/admin/login", { replace: true });
  }

  return (
    <Section>
      <Container className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <Eyebrow>Admin</Eyebrow>
            <h1 className="text-3xl">Admin</h1>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Log Out
          </Button>
        </div>

        <div className="flex gap-2 border-b border-walnut/20">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`border-b-2 px-1 pb-3 font-utility text-sm uppercase tracking-wider transition-colors ${
                tab === t.key
                  ? "border-clay text-clay"
                  : "border-transparent text-ink/60 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "guests" && <GuestListSection />}
        {tab === "campaigns" && <CampaignsSection />}
        {tab === "wedding" && <WeddingSettingsSection />}
      </Container>
    </Section>
  );
}

export default GuestListPage;
