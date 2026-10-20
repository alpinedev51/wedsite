import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/ui/Container";
import Section from "../../components/ui/Section";
import Eyebrow from "../../components/ui/Eyebrow";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../auth/AuthContext";
import { logout as logoutRequest } from "../auth/auth.api";
import CampaignsSection from "../campaigns/CampaignsSection";
import DashboardSection from "../dashboard/DashboardSection";
import WeddingSettingsSection from "../wedding-settings/WeddingSettingsSection";
import GuestListSection from "../guests/GuestListSection";

type Tab = "dashboard" | "guests" | "campaigns" | "wedding";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "guests", label: "Guest List" },
  { key: "campaigns", label: "Campaigns" },
  { key: "wedding", label: "Schedule" },
];

function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
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
                  ? "border-walnut text-walnut"
                  : "border-transparent text-ink/70 hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardSection />}
        {tab === "guests" && <GuestListSection />}
        {tab === "campaigns" && <CampaignsSection />}
        {tab === "wedding" && <WeddingSettingsSection />}
      </Container>
    </Section>
  );
}

export default AdminPage;
