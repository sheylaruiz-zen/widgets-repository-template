// Academy Spotlight widget
// Renders one Academy course: thumbnail, label, title, blurb, CTA button.
// Values come from the widget configuration set in the community editor.

// Already-safe forms: absolute http(s), root-relative, or protocol-relative.
const SAFE_URL = /^(https?:\/\/|\/)/i;
// Any explicit scheme, e.g. javascript:, data:, mailto:, file:
const EXPLICIT_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// Scheme-less but domain-like, e.g. academy.zendesk.com/path or www.example.com
const DOMAIN_LIKE = /^[\w-]+(\.[\w-]+)+([/?#]|$)/;

// Keep in step with rules.minimum / rules.maximum for "inset" in widget.json.
const MIN_INSET = 0;
const MAX_INSET = 64;

function safeUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "") return "";

  // Pass through anything already in a safe form.
  if (SAFE_URL.test(raw)) return raw;

  // Reject any other explicit scheme outright. This must be checked before the
  // domain-like test so values such as "javascript:alert(1)" can never be
  // rewritten into something loadable.
  if (EXPLICIT_SCHEME.test(raw)) {
    console.warn(
      "[academy-spotlight] Ignoring unsupported link scheme: " +
        raw +
        ". Use an https:// URL."
    );
    return "";
  }

  // Assume https for scheme-less domains so a pasted "academy.zendesk.com/..."
  // still works instead of silently hiding the CTA.
  if (DOMAIN_LIKE.test(raw)) {
    return "https://" + raw;
  }

  console.warn(
    "[academy-spotlight] Could not interpret " +
      raw +
      " as a link. Use a full https:// URL."
  );
  return "";
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Returns a clamped pixel value, or null when nothing usable was configured.
// Returning null matters: it leaves the stylesheet default in place rather
// than forcing a value onto instances saved before this setting existed.
function insetPx(value) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    console.warn(
      "[academy-spotlight] Ignoring unusable Side spacing value: " +
        String(value)
    );
    return null;
  }

  return Math.min(Math.max(Math.round(parsed), MIN_INSET), MAX_INSET);
}

function render(root, props) {
  const el = (name) => root.querySelector('[data-as="' + name + '"]');

  // Side spacing lives on the host so the card and any future sibling elements
  // share one value.
  const host = root.host;
  const inset = insetPx(props.inset);
  if (host && inset !== null) {
    host.style.setProperty("--as-inset", inset + "px");
  }

  const media = el("media");
  const image = el("image");
  const label = el("label");
  const title = el("title");
  const blurb = el("blurb");
  const cta = el("cta");
  const ctaLabel = el("cta-label");

  const thumbnailUrl = safeUrl(props.thumbnailUrl);
  if (thumbnailUrl) {
    image.src = thumbnailUrl;
    image.alt = text(props.thumbnailAlt);
    media.hidden = false;
    image.onerror = () => {
      media.hidden = true;
    };
  } else {
    media.hidden = true;
    image.removeAttribute("src");
  }

  const labelText = text(props.label);
  label.textContent = labelText;
  label.hidden = labelText === "";

  title.textContent = text(props.title);

  const blurbText = text(props.blurb);
  blurb.textContent = blurbText;
  blurb.hidden = blurbText === "";

  const ctaUrl = safeUrl(props.ctaUrl);
  const ctaText = text(props.ctaLabel);
  if (ctaUrl && ctaText) {
    cta.href = ctaUrl;
    ctaLabel.textContent = ctaText;
    if (props.openInNewTab === false) {
      cta.removeAttribute("target");
      cta.removeAttribute("rel");
    } else {
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
    }
    cta.hidden = false;
  } else {
    if (!ctaUrl && !ctaText) {
      console.warn(
        "[academy-spotlight] CTA hidden: both Button label and Button link are empty."
      );
    } else if (!ctaUrl) {
      console.warn(
        "[academy-spotlight] CTA hidden: Button link is missing or unusable. Raw value: " +
          String(props.ctaUrl)
      );
    } else {
      console.warn("[academy-spotlight] CTA hidden: Button label is empty.");
    }
    cta.hidden = true;
  }
}

export async function init(sdk) {
  await sdk.whenReady();
  const root = sdk.shadowRoot;

  render(root, sdk.getProps() || {});

  const offPropsChanged = sdk.on("propsChanged", (props) => {
    render(root, props || {});
  });

  sdk.on("destroy", () => {
    offPropsChanged();
  });
}
