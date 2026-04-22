// Minimal HTML sanitizer for contract bodies.
//
// We accept a limited set of formatting tags and only a couple of whitelisted
// style properties. No external dependency is used to keep the build lean.
//
// Output is safe to render via `dangerouslySetInnerHTML`.

const ALLOWED_TAGS = new Set([
    "a", "b", "br", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "i", "li", "ol", "p", "s", "span", "strong", "u", "ul",
]);

// Allowed attributes per tag. `*` applies to any tag.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
    "*": new Set(["class", "style", "data-param"]),
    a: new Set(["class", "style", "href", "target", "rel"]),
};

// Whitelisted CSS properties for the `style` attribute.
const ALLOWED_STYLE_PROPS = new Set([
    "font-size", "font-weight", "font-style", "text-align",
    "text-decoration", "line-height", "color", "background-color",
]);

function sanitizeStyle(value: string): string {
    return value
        .split(";")
        .map((decl) => decl.trim())
        .filter(Boolean)
        .map((decl) => {
            const idx = decl.indexOf(":");
            if (idx < 0) return "";
            const prop = decl.slice(0, idx).trim().toLowerCase();
            const val = decl.slice(idx + 1).trim();
            if (!ALLOWED_STYLE_PROPS.has(prop)) return "";
            // Block url(), expressions, javascript: and similar payloads.
            if (/url\s*\(|expression\s*\(|javascript:|<|>/i.test(val)) return "";
            return `${prop}: ${val}`;
        })
        .filter(Boolean)
        .join("; ");
}

function sanitizeAttribute(tag: string, name: string, value: string): string | null {
    const lname = name.toLowerCase();
    const allowed = ALLOWED_ATTRS[tag] ?? ALLOWED_ATTRS["*"];
    const universal = ALLOWED_ATTRS["*"];
    if (!allowed.has(lname) && !universal.has(lname)) return null;

    if (lname === "style") {
        const cleaned = sanitizeStyle(value);
        return cleaned ? cleaned : null;
    }
    if (lname === "href") {
        // Only allow http(s), mailto, and relative paths.
        const trimmed = value.trim();
        if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;
        return null;
    }
    if (lname === "target") {
        return value === "_blank" ? "_blank" : null;
    }
    if (lname === "rel") {
        return value.replace(/[^a-z0-9\s-]/gi, "").slice(0, 64);
    }
    // For class / data-param: drop anything that might break out of the tag.
    return value.replace(/["'<>]/g, "").slice(0, 200);
}

function escape(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Sanitize a user-supplied HTML fragment.
 * Runs in both server and browser environments (simple regex parser).
 */
export function sanitizeContractHtml(input: string): string {
    if (!input) return "";

    // Drop anything that looks like <script>, <style>, comments, or CDATA.
    const src = input
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
        .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
        .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, "");

    let out = "";
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(src)) !== null) {
        // Append text before the tag (escaped).
        out += escape(src.slice(lastIndex, m.index));
        lastIndex = tagRe.lastIndex;

        const full = m[0];
        const tag = m[1].toLowerCase();
        const rest = m[2] || "";
        const isClose = full.startsWith("</");

        if (!ALLOWED_TAGS.has(tag)) {
            // Drop the tag entirely.
            continue;
        }

        if (isClose) {
            out += `</${tag}>`;
            continue;
        }

        // Parse attributes from `rest`. Accept name="value" | name='value' | name=value | name.
        const attrs: string[] = [];
        const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
        let am: RegExpExecArray | null;
        while ((am = attrRe.exec(rest)) !== null) {
            const aName = am[1];
            const aValRaw = am[2] ?? am[3] ?? am[4] ?? "";
            const safe = sanitizeAttribute(tag, aName, aValRaw);
            if (safe === null) continue;
            attrs.push(`${aName.toLowerCase()}="${escape(safe)}"`);
        }

        // Void elements stay self-closing where appropriate.
        const isVoid = tag === "br";
        const attrStr = attrs.length ? " " + attrs.join(" ") : "";
        out += isVoid ? `<${tag}${attrStr} />` : `<${tag}${attrStr}>`;
    }

    out += escape(src.slice(lastIndex));
    return out;
}

/** Remove all HTML tags from a string (plain-text projection for metadata). */
export function htmlToPlainText(html: string): string {
    return html
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
