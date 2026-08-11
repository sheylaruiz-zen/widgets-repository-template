// Academy Spotlight widget
// Renders one Academy course: thumbnail, label, title, blurb, CTA button.
// Values come from the widget configuration set in the community editor.

const SAFE_URL = /^(https?:\/\/|\/)/i;

function safeUrl(value) {
  const url = typeof value === "string" ? value.trim() : "";
  return SAFE_URL.test(url) ? url : "";
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function render(root, props) {
  const el = (name) => root.querySelector(`[data-as="${name}"]`);

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
