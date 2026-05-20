import type {
  FaqItem,
  GeneratedCopy,
  MultipleEvent,
  RegistryLink,
  ThingsToDoItem,
  WeddingPageConfig,
  WeddingPartyMember,
} from "@/lib/wedding-website";
import type { WeddingPlan } from "@/lib/schema";

/* Shape passed to every layout variant. The page component resolves
 * all of this once from the database; layouts are pure renderers. */
export type WeddingLayoutVenue = {
  name:    string | null;
  city:    string | null;
  address: string | null;
  website: string | null;
  slug:    string | null;
} | null;

export type CreditVendor = {
  name:     string;
  category: string;
  slug:     string | null;
  website:  string | null;
};

export type WeddingLayoutProps = {
  plan:              WeddingPlan;
  venue:             WeddingLayoutVenue;
  config:            WeddingPageConfig;
  credits:           CreditVendor[];
  coupleLabel:       string;
  weddingDateUpper:  string | null;
  weddingDateLong:   string | null;
  venueLine:         string | null;
  generated:         GeneratedCopy | null;
  party:             WeddingPartyMember[];
  registry:          RegistryLink[];
  things:            ThingsToDoItem[];
  extraEvents:       MultipleEvent[];
  gallery:           string[];
  faqItems:          FaqItem[];
  storyPhoto:        string | null;
  /* Site-URL used for absolute cross-domain links into the directory.
   * Passed in so layouts don't have to read env vars themselves. */
  siteUrl:           string;
};
