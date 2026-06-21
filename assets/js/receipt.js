/* =========================================================
   Thank-you / Receipt page logic
   ---------------------------------------------------------
   EDIT THESE SETTINGS for your trust:
   ========================================================= */
var HTF_CONFIG = {
  orgName: "Human Team Foundation",
  regNo: "XXXXXX",
  whatsappNumber: "919769406488",   // trust WhatsApp number, country code, no + or spaces
  certPath: "assets/docs/80G-certificate.pdf"
};

(function () {
  "use strict";

  /* ---- Load donation data ---- */
  var data = null;
  try { data = JSON.parse(sessionStorage.getItem("htf_donation") || "null"); } catch (e) {}

  var wrap = document.getElementById("receiptWrap");
  var empty = document.getElementById("emptyState");

  if (!data || !data.amount) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (wrap) wrap.style.display = "block";

  /* ---- Helpers ---- */
  var pad = function (n, l) { n = String(n); while (n.length < l) n = "0" + n; return n; };

  var receiptNo = data.receipt;
  if (!receiptNo) {
    // client-side fallback receipt number (provisional)
    var d = new Date();
    var fyStart = (d.getMonth() + 1) >= 4 ? d.getFullYear() : d.getFullYear() - 1;
    var fy = fyStart + "-" + String(fyStart + 1).slice(2);
    var seq = pad(((d.getTime() / 1000) | 0) % 10000, 4);
    receiptNo = "HTF/" + fy + "/" + seq;
  }

  var now = new Date();
  var dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  var amountStr = "₹" + Number(data.amount).toLocaleString("en-IN");

  /* ---- Amount in words (Indian system) ---- */
  function numToWords(num) {
    if (num === 0) return "zero";
    var a = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
      "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    var b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    function two(n) { return n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : ""); }
    function three(n) {
      var h = Math.floor(n / 100), r = n % 100;
      return (h ? a[h] + " hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
    }
    var out = "";
    var crore = Math.floor(num / 10000000); num %= 10000000;
    var lakh = Math.floor(num / 100000); num %= 100000;
    var thousand = Math.floor(num / 1000); num %= 1000;
    var hundred = num;
    if (crore) out += three(crore) + " crore ";
    if (lakh) out += three(lakh) + " lakh ";
    if (thousand) out += three(thousand) + " thousand ";
    if (hundred) out += three(hundred);
    return out.trim();
  }
  var words = numToWords(parseInt(data.amount, 10)) + " rupees only";

  /* ---- Fill DOM ---- */
  var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  set("r-firstname", (data.name || "friend").split(" ")[0]);
  set("r-receipt", receiptNo);
  set("r-date", dateStr);
  set("r-name", data.name || "—");
  set("r-email", data.email || "—");
  set("r-phone", data.phone || "—");
  set("r-amount", amountStr);
  set("r-words", words);

  /* ---- WhatsApp share ---- */
  var waMsg = "Hi " + HTF_CONFIG.orgName + "! I have donated " + amountStr +
    " (Receipt: " + receiptNo + "). Please share my official donation receipt and 80G certificate. — " + (data.name || "");
  var wa = document.getElementById("whatsappShare");
  if (wa) wa.href = "https://wa.me/" + HTF_CONFIG.whatsappNumber + "?text=" + encodeURIComponent(waMsg);

  /* ---- 80G certificate availability ---- */
  var g80 = document.getElementById("download80g");
  var g80note = document.getElementById("g80note");
  if (g80) {
    fetch(HTF_CONFIG.certPath, { method: "HEAD" })
      .then(function (r) {
        if (!r.ok) throw new Error("not found");
      })
      .catch(function () {
        g80.style.display = "none";
        if (g80note) g80note.style.display = "block";
      });
  }

  /* ---- Download PDF receipt (jsPDF) ---- */
  var btn = document.getElementById("downloadReceipt");
  if (btn) {
    btn.addEventListener("click", function () {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        window.print();
        return;
      }
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: "pt", format: "a4" });
      var W = doc.internal.pageSize.getWidth();
      var m = 48;
      var brand = [15, 118, 110], ink = [31, 41, 55], muted = [107, 114, 128];

      // border
      doc.setDrawColor(220); doc.setLineWidth(1);
      doc.rect(m - 14, m - 14, W - 2 * (m - 14), 760);

      // header band
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.rect(m - 14, m - 14, W - 2 * (m - 14), 78, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text(HTF_CONFIG.orgName, m + 4, m + 20);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text("Reg. No. " + HTF_CONFIG.regNo + "  |  80G & 12A Registered", m + 4, m + 40);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("DONATION RECEIPT", W - m - 4, m + 28, { align: "right" });

      var y = m + 110;
      doc.setTextColor(muted[0], muted[1], muted[2]); doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      var row = function (label, value, bold) {
        doc.setTextColor(muted[0], muted[1], muted[2]); doc.setFont("helvetica", "normal");
        doc.text(label, m + 4, y);
        doc.setTextColor(ink[0], ink[1], ink[2]); doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(String(value), W - m - 4, y, { align: "right" });
        y += 26;
        doc.setDrawColor(235); doc.line(m + 4, y - 14, W - m - 4, y - 14);
      };
      row("Receipt No.", receiptNo, true);
      row("Date", dateStr);
      row("Received With Thanks From", data.name || "—", true);
      row("Email", data.email || "—");
      row("Phone", data.phone || "—");
      row("Payment Mode", "UPI / Bank Transfer");

      // amount box
      y += 10;
      doc.setFillColor(240, 253, 250);
      doc.roundedRect(m + 4, y, W - 2 * m - 8, 64, 8, 8, "F");
      doc.setTextColor(brand[0], brand[1], brand[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(22);
      doc.text(amountStr, W / 2, y + 30, { align: "center" });
      doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(muted[0], muted[1], muted[2]);
      var capWords = words.charAt(0).toUpperCase() + words.slice(1);
      doc.text("(" + capWords + ")", W / 2, y + 50, { align: "center" });
      y += 96;

      // note
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(muted[0], muted[1], muted[2]);
      var note = "This donation is eligible for tax exemption under Section 80G of the Income Tax Act, 1961. " +
        "Your official 80G certificate (Form 10BE) will be issued after the annual filing. " +
        "This is a computer-generated provisional receipt and does not require a signature.";
      doc.text(doc.splitTextToSize(note, W - 2 * m - 8), m + 4, y);
      y += 70;

      doc.setTextColor(ink[0], ink[1], ink[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("Thank you for your generosity ", m + 4, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text("For Human Team Foundation", W - m - 4, y + 40, { align: "right" });
      doc.setDrawColor(200); doc.line(W - m - 150, y + 30, W - m - 4, y + 30);
      doc.text("Authorised Signatory", W - m - 4, y + 54, { align: "right" });

      doc.save("Receipt-" + receiptNo.replace(/[^\w]+/g, "-") + ".pdf");
    });
  }

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = now.getFullYear();
})();
