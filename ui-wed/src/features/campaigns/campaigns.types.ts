// Mirrors service-wed's domain/value_objects.py::CampaignType/CampaignStatus
// and schemas/campaign.py -- keep these in sync if those backend types
// change shape.
export type { Page } from "../../types";

// "reminder" is deliberately omitted from the values the create form
// offers (see CampaignCreateForm) -- it's already fully automated by the
// daily evaluate_reminders cron (tasks/reminders.py), so a manually
// created reminder campaign would just be redundant with that. The type
// still needs to exist here since CampaignAdminView (read from the list/
// detail endpoints) can include reminder campaigns the cron itself created.
export type CampaignType =
  "save_the_date" | "rsvp_invite" | "reminder" | "final_details" | "thank_you";

export type CampaignStatus =
  "draft" | "scheduled" | "sending" | "sent" | "canceled";

export interface CampaignAdminView {
  id: string;
  type: CampaignType;
  subject: string;
  template_key: string;
  scheduled_for: string;
  status: CampaignStatus;
  created_by: string | null;
}

export interface CampaignCreateRequest {
  type: CampaignType;
  subject: string;
  template_key: string;
  scheduled_for: string;
}

export interface CampaignRescheduleRequest {
  scheduled_for: string;
}
