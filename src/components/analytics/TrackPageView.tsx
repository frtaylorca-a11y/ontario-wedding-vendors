"use client";

import { useEffect } from "react";
import { trackMetaViewContent } from "@/lib/analytics";

/**
 * Fires the Meta Pixel ViewContent event when a vendor or venue detail
 * page mounts. PageView is already fired automatically by the Pixel base
 * script; this adds the content-specific event so retargeting audiences
 * can target couples who looked at a specific category or venue type.
 */
export function TrackPageView(props: {
  contentType: "vendor" | "venue";
  contentName: string;
  contentCategory?: string;
}) {
  useEffect(() => {
    trackMetaViewContent({
      content_type:     props.contentType,
      content_name:     props.contentName,
      content_category: props.contentCategory,
    });
  }, [props.contentType, props.contentName, props.contentCategory]);
  return null;
}
