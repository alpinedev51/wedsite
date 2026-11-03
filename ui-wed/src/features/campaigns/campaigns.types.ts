import type { Schemas } from "../../types";

export type { Page } from "../../types";

// Includes "reminder", which the create form doesn't offer: the daily
// reminder job creates those itself, but they still show up in the list.
export type CampaignType = Schemas["CampaignType"];
export type CampaignStatus = Schemas["CampaignStatus"];
export type CampaignAdminView = Schemas["CampaignAdminView"];
// Adds the campaign's live delivery breakdown -- the way to tell whether its
// emails went out, since status stays "scheduled" after fan-out.
export type CampaignDetailView = Schemas["CampaignDetailView"];
export type CampaignCreateRequest = Schemas["CampaignCreateRequest"];
export type CampaignRescheduleRequest = Schemas["CampaignRescheduleRequest"];
