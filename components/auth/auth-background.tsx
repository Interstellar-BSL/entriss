"use client";

import { useEffect, useState } from "react";

import {
  AUTH_BACKGROUND_IMAGE_URL,
  AUTH_PAGE_ROOT_ID,
} from "@/lib/auth/auth-background-image";
import { cn } from "@/lib/utils/cn";

type ImageState = "loading" | "ready" | "failed";

export function AuthBackground() {
  const [imageState, setImageState] = useState<ImageState>("loading");

  useEffect(() => {
    const root = document.getElementById(AUTH_PAGE_ROOT_ID);
    const imageActive = imageState === "ready";

    if (root) {
      root.dataset.authImage = imageActive ? "active" : "fallback";
    }

    return () => {
      if (root) {
        delete root.dataset.authImage;
      }
    };
  }, [imageState]);

  useEffect(() => {
    let cancelled = false;

    const preloadLink = document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "image";
    preloadLink.href = AUTH_BACKGROUND_IMAGE_URL;
    document.head.appendChild(preloadLink);

    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      if (!cancelled) {
        setImageState("ready");
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setImageState("failed");
      }
    };

    image.src = AUTH_BACKGROUND_IMAGE_URL;

    return () => {
      cancelled = true;
      preloadLink.remove();
      image.onload = null;
      image.onerror = null;
    };
  }, []);

  const showImage = imageState === "ready";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-[var(--background)] via-[var(--surface-muted)] to-[var(--background)] transition-opacity duration-500",
          showImage ? "opacity-0" : "opacity-100",
        )}
      />

      {imageState !== "failed" ? (
        <div
          className={cn(
            "auth-background-image absolute inset-0",
            showImage && "auth-background-image-visible",
          )}
          style={{ backgroundImage: `url("${AUTH_BACKGROUND_IMAGE_URL}")` }}
        />
      ) : null}

      {showImage ? (
        <>
          <div className="auth-background-overlay-dark absolute inset-0" />
          <div className="auth-background-overlay-brand absolute inset-0" />
        </>
      ) : null}

      <div
        className={cn(
          "auth-ambient-blob auth-ambient-blob-a",
          showImage && "auth-ambient-blob-on-image",
        )}
      />
      <div
        className={cn(
          "auth-ambient-blob auth-ambient-blob-b",
          showImage && "auth-ambient-blob-on-image",
        )}
      />
      <div
        className={cn(
          "auth-ambient-blob auth-ambient-blob-c",
          showImage && "auth-ambient-blob-on-image",
        )}
      />
    </div>
  );
}
