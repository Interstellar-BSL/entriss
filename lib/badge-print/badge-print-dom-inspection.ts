import type { BadgePrintFormat } from "@/lib/badge-print/badge-print-styles";

const DOM_LOG = "[BADGE_PRINT_DOM]";

export interface BadgePrintDomElementSummary {
  tag: string;
  id: string | null;
  classes: string[];
  domPath: string;
  widthPx: number;
  heightPx: number;
  offsetTopPx: number;
  offsetLeftPx: number;
  scrollHeightPx: number;
  display: string;
  visibility: string;
  transform: string;
  margin: string;
  padding: string;
  pageBreakInside: string;
  breakInside: string;
  parentTag: string | null;
  parentId: string | null;
  parentClasses: string[];
}

export interface BadgePrintDomInspection {
  capturedAt: string;
  htmlLength: number;
  bodyInnerHtmlLength: number;
  bodyChildCount: number;
  bodyChildren: Array<{
    index: number;
    tag: string;
    id: string | null;
    classes: string[];
    widthPx: number;
    heightPx: number;
    scrollHeightPx: number;
    isEmpty: boolean;
  }>;
  rootElementIds: string[];
  rootElementClasses: string[];
  printableRootCount: number;
  printableRoots: Array<{
    domPath: string;
    tag: string;
    id: string | null;
    classes: string[];
    widthPx: number;
    heightPx: number;
    scrollHeightPx: number;
  }>;
  qrElementCount: number;
  qrElements: BadgePrintDomElementSummary[];
  badgeRootHierarchy: string[];
  badgeRootContains: {
    hasBranding: boolean;
    hasVisitorFields: boolean;
    hasQr: boolean;
    hasPhoto: boolean;
    hasMeta: boolean;
  };
  blankPageCandidates: Array<{
    source: string;
    detail: string;
  }>;
  pageSizing: {
    format: BadgePrintFormat;
    declaredPageSize: string;
    htmlScrollHeightPx: number;
    bodyScrollHeightPx: number;
    badgeRootScrollHeightPx: number;
    iframeViewportWidthPx: number;
    iframeViewportHeightPx: number;
    estimatedPageHeightPx: number;
    estimatedPageCountFromBadgeRoot: number;
  };
  bodyInnerHtml: string;
  fullDocumentHtml: string;
}

declare global {
  interface Window {
    __BADGE_PRINT_DEBUG?: BadgePrintDomInspection;
  }
}

function getDomPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : "";
    const className =
      current.classList.length > 0
        ? `.${Array.from(current.classList).join(".")}`
        : "";
    segments.unshift(`${tag}${id}${className}`);
    current = current.parentElement;
  }

  return segments.join(" > ");
}

function summarizeElement(element: Element, doc: Document): BadgePrintDomElementSummary {
  const htmlElement = element as HTMLElement;
  const style = doc.defaultView?.getComputedStyle(htmlElement);
  const rect = htmlElement.getBoundingClientRect();
  const parent = element.parentElement;

  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList),
    domPath: getDomPath(element),
    widthPx: Math.round(rect.width),
    heightPx: Math.round(rect.height),
    offsetTopPx: Math.round(htmlElement.offsetTop),
    offsetLeftPx: Math.round(htmlElement.offsetLeft),
    scrollHeightPx: Math.round(htmlElement.scrollHeight),
    display: style?.display ?? "unknown",
    visibility: style?.visibility ?? "unknown",
    transform: style?.transform ?? "none",
    margin: style?.margin ?? "unknown",
    padding: style?.padding ?? "unknown",
    pageBreakInside: style?.pageBreakInside ?? style?.breakInside ?? "unknown",
    breakInside: style?.breakInside ?? "unknown",
    parentTag: parent?.tagName.toLowerCase() ?? null,
    parentId: parent?.id || null,
    parentClasses: parent ? Array.from(parent.classList) : [],
  };
}

function isVisuallyEmpty(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 && element.scrollHeight === 0;
}

function collectBadgeRootHierarchy(root: HTMLElement): string[] {
  const lines: string[] = [];
  const queue: Array<{ element: Element; depth: number }> = [
    { element: root, depth: 0 },
  ];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) {
      continue;
    }

    const { element, depth } = item;
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes =
      element.classList.length > 0
        ? `.${Array.from(element.classList).join(".")}`
        : "";
    const rect = (element as HTMLElement).getBoundingClientRect();

    lines.push(
      `${"  ".repeat(depth)}${tag}${id}${classes} (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
    );

    for (const child of Array.from(element.children)) {
      queue.push({ element: child, depth: depth + 1 });
    }
  }

  return lines;
}

function findBlankPageCandidates(
  doc: Document,
  format: BadgePrintFormat,
  badgeRoot: HTMLElement | null,
): Array<{ source: string; detail: string }> {
  const candidates: Array<{ source: string; detail: string }> = [];
  const html = doc.documentElement;
  const body = doc.body;
  const view = doc.defaultView;

  if (!body || !view) {
    return candidates;
  }

  const htmlStyle = view.getComputedStyle(html);
  const bodyStyle = view.getComputedStyle(body);

  if (htmlStyle.margin !== "0px" || bodyStyle.margin !== "0px") {
    candidates.push({
      source: "document-margin",
      detail: `html margin=${htmlStyle.margin}, body margin=${bodyStyle.margin}`,
    });
  }

  if (htmlStyle.padding !== "0px" || bodyStyle.padding !== "0px") {
    candidates.push({
      source: "document-padding",
      detail: `html padding=${htmlStyle.padding}, body padding=${bodyStyle.padding}`,
    });
  }

  if (bodyStyle.transform !== "none") {
    candidates.push({
      source: "body-transform",
      detail: `body transform=${bodyStyle.transform}`,
    });
  }

  if (badgeRoot) {
    const rootStyle = view.getComputedStyle(badgeRoot);
    if (rootStyle.transform !== "none") {
      candidates.push({
        source: "badge-root-transform",
        detail: `#badge-print-root transform=${rootStyle.transform}`,
      });
    }

    const rootRect = badgeRoot.getBoundingClientRect();
    if (rootRect.top > 8) {
      candidates.push({
        source: "badge-root-offset-top",
        detail: `#badge-print-root top offset ${Math.round(rootRect.top)}px from viewport top`,
      });
    }
  }

  const fitStyle = doc.querySelector('style[data-badge-print-fit="true"]');
  if (fitStyle) {
    candidates.push({
      source: "injected-fit-scale-style",
      detail: "legacy fit-scale style present (should not be injected after Phase 6.24)",
    });
  }

  candidates.push({
    source: "@page-declaration",
    detail: "margin: 5mm; no forced paper size (browser/printer chooses)",
  });

  const emptyBodyChildren = Array.from(body.children).filter((child) =>
    isVisuallyEmpty(child as HTMLElement),
  );
  if (emptyBodyChildren.length > 0) {
    candidates.push({
      source: "empty-body-children",
      detail: `${emptyBodyChildren.length} visually empty direct body child(ren): ${emptyBodyChildren
        .map((child) => child.tagName.toLowerCase() + (child.id ? `#${child.id}` : ""))
        .join(", ")}`,
    });
  }

  const hiddenWrappers = Array.from(doc.querySelectorAll("body *")).filter((node) => {
    const el = node as HTMLElement;
    const style = view.getComputedStyle(el);
    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    );
  });
  if (hiddenWrappers.length > 0) {
    candidates.push({
      source: "hidden-elements",
      detail: `${hiddenWrappers.length} hidden descendant(s) in print document`,
    });
  }

  const iframeViewportHeight = view.innerHeight;
  const bodyScrollHeight = body.scrollHeight;
  if (bodyScrollHeight > iframeViewportHeight * 1.1) {
    candidates.push({
      source: "body-overflow-viewport",
      detail: `body scrollHeight ${bodyScrollHeight}px exceeds iframe viewport ${iframeViewportHeight}px`,
    });
  }

  return candidates;
}

function isPrintableRoot(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  const rect = htmlElement.getBoundingClientRect();
  const hasSize = rect.width > 0 || rect.height > 0 || htmlElement.scrollHeight > 0;
  const isScriptOrStyle = element.tagName === "SCRIPT" || element.tagName === "STYLE";
  return hasSize && !isScriptOrStyle;
}

export function inspectBadgePrintDocument(
  doc: Document,
  format: BadgePrintFormat,
  htmlLength: number,
): BadgePrintDomInspection {
  const body = doc.body;
  const bodyChildren = body ? Array.from(body.children) : [];
  const badgeRoot = doc.getElementById("badge-print-root");

  const bodyChildSummaries = bodyChildren.map((child, index) => {
    const htmlChild = child as HTMLElement;
    const rect = htmlChild.getBoundingClientRect();
    return {
      index,
      tag: child.tagName.toLowerCase(),
      id: child.id || null,
      classes: Array.from(child.classList),
      widthPx: Math.round(rect.width),
      heightPx: Math.round(rect.height),
      scrollHeightPx: Math.round(htmlChild.scrollHeight),
      isEmpty: isVisuallyEmpty(htmlChild),
    };
  });

  const printableRoots = bodyChildren
    .filter(isPrintableRoot)
    .map((child) => {
      const htmlChild = child as HTMLElement;
      const rect = htmlChild.getBoundingClientRect();
      return {
        domPath: getDomPath(child),
        tag: child.tagName.toLowerCase(),
        id: child.id || null,
        classes: Array.from(child.classList),
        widthPx: Math.round(rect.width),
        heightPx: Math.round(rect.height),
        scrollHeightPx: Math.round(htmlChild.scrollHeight),
      };
    });

  const qrNodes = Array.from(
    doc.querySelectorAll(".badge-print-qr img, img[alt='Visit QR code'], canvas"),
  );
  const qrElements = qrNodes.map((node) => summarizeElement(node, doc));

  const badgeRootHierarchy = badgeRoot
    ? collectBadgeRootHierarchy(badgeRoot)
    : [];

  const view = doc.defaultView;

  const inspection: BadgePrintDomInspection = {
    capturedAt: new Date().toISOString(),
    htmlLength,
    bodyInnerHtmlLength: body?.innerHTML.length ?? 0,
    bodyChildCount: bodyChildren.length,
    bodyChildren: bodyChildSummaries,
    rootElementIds: bodyChildren.map((child) => child.id).filter(Boolean) as string[],
    rootElementClasses: bodyChildren.flatMap((child) => Array.from(child.classList)),
    printableRootCount: printableRoots.length,
    printableRoots,
    qrElementCount: qrElements.length,
    qrElements,
    badgeRootHierarchy,
    badgeRootContains: {
      hasBranding: Boolean(
        badgeRoot?.querySelector(".badge-print-logo, .badge-print-org, .badge-print-header"),
      ),
      hasVisitorFields: Boolean(badgeRoot?.querySelector(".badge-print-fields")),
      hasQr: Boolean(badgeRoot?.querySelector(".badge-print-qr img")),
      hasPhoto: Boolean(badgeRoot?.querySelector(".badge-print-photo")),
      hasMeta: Boolean(badgeRoot?.querySelector(".badge-print-meta")),
    },
    blankPageCandidates: findBlankPageCandidates(doc, format, badgeRoot),
    pageSizing: {
      format,
      declaredPageSize: "auto (printer default)",
      htmlScrollHeightPx: doc.documentElement.scrollHeight,
      bodyScrollHeightPx: body?.scrollHeight ?? 0,
      badgeRootScrollHeightPx: badgeRoot?.scrollHeight ?? 0,
      iframeViewportWidthPx: view?.innerWidth ?? 0,
      iframeViewportHeightPx: view?.innerHeight ?? 0,
      estimatedPageHeightPx: 0,
      estimatedPageCountFromBadgeRoot: badgeRoot ? 1 : 0,
    },
    bodyInnerHtml: body?.innerHTML ?? "",
    fullDocumentHtml: doc.documentElement.outerHTML,
  };

  return inspection;
}

export function captureAndLogBadgePrintDom(
  doc: Document,
  format: BadgePrintFormat,
  htmlLength: number,
): BadgePrintDomInspection {
  const inspection = inspectBadgePrintDocument(doc, format, htmlLength);

  if (typeof window !== "undefined") {
    window.__BADGE_PRINT_DEBUG = inspection;
  }

  console.info(DOM_LOG, {
    htmlLength: inspection.htmlLength,
    bodyChildCount: inspection.bodyChildCount,
    rootElementIds: inspection.rootElementIds,
    rootElementClasses: inspection.rootElementClasses,
    printableRootCount: inspection.printableRootCount,
    printableRoots: inspection.printableRoots,
    qrElementCount: inspection.qrElementCount,
    qrElements: inspection.qrElements.map((qr) => ({
      domPath: qr.domPath,
      widthPx: qr.widthPx,
      heightPx: qr.heightPx,
      parentTag: qr.parentTag,
      parentId: qr.parentId,
      parentClasses: qr.parentClasses,
    })),
    badgeRootContains: inspection.badgeRootContains,
    badgeRootHierarchy: inspection.badgeRootHierarchy,
    blankPageCandidates: inspection.blankPageCandidates,
    pageSizing: inspection.pageSizing,
    debugGlobal: "window.__BADGE_PRINT_DEBUG",
    bodyInnerHtmlPreview: inspection.bodyInnerHtml.slice(0, 500),
  });

  return inspection;
}
