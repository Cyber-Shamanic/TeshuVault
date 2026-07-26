/* מרנדר Markdown מקומי ומצומצם למסמכי המאגר */
(function () {
  "use strict";

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const safeUrl = (raw) => {
    const url = String(raw || "").trim();
    if (/^(https?:\/\/|mailto:|tel:|\.{0,2}\/|[a-zA-Z0-9_-]+\/|#[\w-]+)/.test(url)) {
      return escapeHtml(url);
    }
    return "#";
  };

  const inline = (raw) => {
    let text = escapeHtml(raw);
    const codeTokens = [];

    text = text.replace(/`([^`]+)`/g, (_, code) => {
      const token = `%%CODE${codeTokens.length}%%`;
      codeTokens.push(`<code>${code}</code>`);
      return token;
    });

    text = text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `<a href="${safeUrl(url)}">${label}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

    codeTokens.forEach((token, index) => {
      text = text.replace(`%%CODE${index}%%`, token);
    });
    return text;
  };

  const tableFrom = (lines, startIndex) => {
    if (startIndex + 1 >= lines.length) return null;
    const header = lines[startIndex];
    const delimiter = lines[startIndex + 1];
    if (!header.includes("|") || !/^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(delimiter)) return null;

    const split = (line) => line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((cell) => cell.trim());

    const headers = split(header);
    const rows = [];
    let cursor = startIndex + 2;
    while (cursor < lines.length && lines[cursor].includes("|") && lines[cursor].trim()) {
      rows.push(split(lines[cursor]));
      cursor += 1;
    }

    const html = [
      "<div class=\"table-scroll\"><table><thead><tr>",
      ...headers.map((cell) => `<th>${inline(cell)}</th>`),
      "</tr></thead><tbody>",
      ...rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`),
      "</tbody></table></div>"
    ].join("");

    return { html, next: cursor };
  };

  const render = (markdown) => {
    const cleaned = String(markdown || "")
      .replace(/<div\s+dir=["']rtl["']\s*>/gi, "")
      .replace(/<\/div>\s*$/gi, "")
      .replace(/\r\n?/g, "\n");

    const lines = cleaned.split("\n");
    const output = [];
    let paragraph = [];
    let listType = null;
    let inCode = false;
    let codeLines = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (!listType) return;
      output.push(`</${listType}>`);
      listType = null;
    };

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (line.trim().startsWith("```")) {
        flushParagraph();
        closeList();
        if (!inCode) {
          inCode = true;
          codeLines = [];
        } else {
          output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
          inCode = false;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      const table = tableFrom(lines, i);
      if (table) {
        flushParagraph();
        closeList();
        output.push(table.html);
        i = table.next - 1;
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      if (/^\s*---+\s*$/.test(line)) {
        flushParagraph();
        closeList();
        output.push("<hr>");
        continue;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        output.push(`<blockquote>${inline(quote[1])}</blockquote>`);
        continue;
      }

      const task = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (task) {
        flushParagraph();
        if (listType !== "ul") {
          closeList();
          output.push("<ul>");
          listType = "ul";
        }
        const checked = task[1].toLowerCase() === "x";
        output.push(`<li class="task-item"><span class="task-box">${checked ? "✓" : ""}</span>${inline(task[2])}</li>`);
        continue;
      }

      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      if (unordered) {
        flushParagraph();
        if (listType !== "ul") {
          closeList();
          output.push("<ul>");
          listType = "ul";
        }
        output.push(`<li>${inline(unordered[1])}</li>`);
        continue;
      }

      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (ordered) {
        flushParagraph();
        if (listType !== "ol") {
          closeList();
          output.push("<ol>");
          listType = "ol";
        }
        output.push(`<li>${inline(ordered[1])}</li>`);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();
    if (inCode) output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    return output.join("\n");
  };

  const fallbacks = {
    changelog: `# יומן גרסאות

## [0.0.1] — 26.07.2026

- [x] 40 פרשנויות ממקרא, חז״ל, הלכה, מוסר, קבלה, חסידות ומחשבה.
- [x] מסלול מעשי בן 12 שערים.
- [x] תוכנית 40 יום ומפת תשובה קבלית.
- [x] חיפוש, סינון, התקדמות ויומן פרטי.
- [x] תמיכה מלאה בעברית וב־RTL.
- [x] שלוש יצירות חזותיות מקוריות.
- [x] 120 משימות לגרסאות הבאות.

המסמך המלא נמצא בקובץ \`CHANGELOG.md\`.`,
    todo: `# מפת פיתוח

## 12 תחומי הפיתוח

- [x] יסודות התוכן והאתר.
- [ ] מחקר ומקורות מורחבים.
- [ ] מסלולי לימוד מותאמים.
- [ ] כלים אישיים וייצוא פרטי.
- [ ] מצב חברותא וקבוצה.
- [ ] נגישות וריבוי שפות.
- [ ] מפות ידע ותרשימים.
- [ ] חוויית משתמש מתקדמת.
- [ ] בדיקות ואבטחת איכות.
- [ ] PWA ועבודה מלאה ללא רשת.
- [ ] קהילה ותרומות.
- [ ] מהדורת 1.0 מבוקרת.

הרשימה המלאה כוללת 120 סעיפים בקובץ \`TODO.md\`.`,
    sources: `# מקורות מרכזיים

- [דברים ל׳](https://www.sefaria.org/Deuteronomy.30.1-10)
- [יומא פ״ה–פ״ו](https://www.sefaria.org/Yoma.85b-86b)
- [רמב״ם, הלכות תשובה](https://www.sefaria.org/Mishneh_Torah%2C_Repentance)
- [שערי תשובה](https://www.sefaria.org/Sha%27arei_Teshuvah)
- [ראשית חכמה, שער התשובה](https://www.sefaria.org/Reshit_Chokhmah%2C_Gate_of_Repentance)
- [תניא, אגרת התשובה](https://www.sefaria.org/Tanya%2C_Part_III%3B_Iggeret_HaTeshuvah)
- [ליקוטי מוהר״ן ו׳](https://www.sefaria.org/Likutei_Moharan.6)
- [אורות התשובה](https://www.sefaria.org/Orot_HaTeshuvah)

**חזון ואוצרות:** Cyber Shamanic  
**פיתוח ויצירה:** לאון יעקובוב — AnLoMinus`
  };

  const loadInto = async (element) => {
    if (!element || element.dataset.loaded === "true") return;
    const filename = element.dataset.markdownFile;
    const fallback = fallbacks[element.dataset.fallback] || "המסמך זמין בקובץ המאגר.";
    element.innerHTML = "<p>טוען את המסמך…</p>";

    try {
      const response = await fetch(filename, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      element.innerHTML = render(markdown);
    } catch (_error) {
      element.innerHTML = render(fallback);
      element.insertAdjacentHTML(
        "beforeend",
        `<p><small>בפתיחה ישירה מוצגת תמצית מובנית. להצגת המסמך המלא הפעילו שרת מקומי או פתחו את <a href="${safeUrl(filename)}">${escapeHtml(filename)}</a>.</small></p>`
      );
    }
    element.dataset.loaded = "true";
  };

  window.TeshuMarkdown = { render, loadInto, escapeHtml };
})();
