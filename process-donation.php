<?php
/* =========================================================
   Human Team Foundation — donation processor
   - assigns a sequential receipt number (per financial year)
   - logs the donation to a CSV OUTSIDE the public web folder
   - emails the receipt to the donor and a copy to the admin
   ========================================================= */

header("Content-Type: application/json; charset=utf-8");

/* ---- Settings (edit these) ---- */
$ORG          = "Human Team Foundation";
$FROM_EMAIL   = "info@humanteamfoundation.in";   // must be an address on your domain
$ADMIN_EMAIL  = "htf.humanteamfoundation@gmail.com";   // where you receive donation alerts
$REG_NO       = "XXXXXX";

/* ---- Only accept POST ---- */
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "Method not allowed"]);
  exit;
}

/* ---- Read input (JSON or form) ---- */
$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) { $data = $_POST; }

function clean_field($s) {
  // strip line breaks (prevents header/CSV injection) and trim
  return trim(str_replace(["\r", "\n", "\t"], " ", (string)($s ?? "")));
}

$name    = clean_field($data["name"]    ?? "");
$email   = clean_field($data["email"]   ?? "");
$phone   = clean_field($data["phone"]   ?? "");
$message = clean_field($data["message"] ?? "");
$amount  = (int)($data["amount"] ?? 0);

if ($name === "" || $amount < 1) {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "Name and a valid amount are required"]);
  exit;
}

/* ---- Private data folder (one level ABOVE public_html) ---- */
$dir = dirname(__DIR__) . "/htf-private";
if (!is_dir($dir)) { @mkdir($dir, 0700, true); }

/* ---- Financial year + sequential receipt number ---- */
$ts = time();
$y  = (int)date("Y", $ts);
$mo = (int)date("n", $ts);
$fyStart = ($mo >= 4) ? $y : $y - 1;
$fy = $fyStart . "-" . substr((string)($fyStart + 1), 2, 2);

$seq = 1;
$counterFile = $dir . "/counter.json";
$fp = @fopen($counterFile, "c+");
if ($fp) {
  flock($fp, LOCK_EX);
  $j = json_decode(stream_get_contents($fp), true);
  if (!is_array($j)) { $j = []; }
  $seq = (int)($j[$fy] ?? 0) + 1;
  $j[$fy] = $seq;
  rewind($fp); ftruncate($fp, 0);
  fwrite($fp, json_encode($j));
  fflush($fp); flock($fp, LOCK_UN); fclose($fp);
}
$receipt = "HTF/" . $fy . "/" . str_pad((string)$seq, 4, "0", STR_PAD_LEFT);

/* ---- Append to donations.csv ---- */
$csv = $dir . "/donations.csv";
$isNew = !file_exists($csv);
$lf = @fopen($csv, "a");
if ($lf) {
  flock($lf, LOCK_EX);
  if ($isNew) {
    fputcsv($lf, ["Receipt No", "Date", "Name", "Email", "Phone", "Amount", "Message", "Status"]);
  }
  // guard against CSV/formula injection
  $g = function ($v) {
    $v = (string)$v;
    return preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;
  };
  fputcsv($lf, [
    $receipt, date("Y-m-d H:i", $ts),
    $g($name), $g($email), $g($phone), $amount, $g($message), "Pending verification"
  ]);
  flock($lf, LOCK_UN); fclose($lf);
}

/* ---- Emails ---- */
$amtFmt  = "Rs. " . number_format($amount);
$dateFmt = date("d M Y", $ts);
$headers = "MIME-Version: 1.0\r\n"
         . "Content-Type: text/html; charset=UTF-8\r\n"
         . "From: {$ORG} <{$FROM_EMAIL}>\r\n";

if ($email !== "" && filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $body = "
    <div style='font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden'>
      <div style='background:#0f766e;color:#fff;padding:20px 24px'>
        <h2 style='margin:0'>{$ORG}</h2>
        <div style='font-size:12px;opacity:.9'>Reg. No. {$REG_NO} &middot; 80G &amp; 12A</div>
      </div>
      <div style='padding:24px'>
        <h3>Thank you, " . htmlspecialchars($name) . "! 🙏</h3>
        <p>We gratefully acknowledge your generous donation.</p>
        <table style='width:100%;font-size:14px;border-collapse:collapse'>
          <tr><td style='padding:6px 0;color:#6b7280'>Receipt No</td><td style='text-align:right;font-weight:bold'>{$receipt}</td></tr>
          <tr><td style='padding:6px 0;color:#6b7280'>Date</td><td style='text-align:right'>{$dateFmt}</td></tr>
          <tr><td style='padding:6px 0;color:#6b7280'>Amount</td><td style='text-align:right;font-weight:bold;color:#0f766e'>{$amtFmt}</td></tr>
        </table>
        <p style='font-size:13px;color:#6b7280;margin-top:16px'>This donation is eligible for tax exemption under Section 80G. Your official 80G certificate (Form 10BE) will be issued after our annual filing.</p>
        <p>With gratitude,<br><b>{$ORG}</b></p>
      </div>
    </div>";
  @mail($email, "Your donation receipt {$receipt} - {$ORG}", $body, $headers);
}

$adminHeaders = $headers . "Reply-To: " . ($email !== "" ? $email : $FROM_EMAIL) . "\r\n";
$adminBody = "<h3>New donation received</h3>
  <p><b>Receipt:</b> {$receipt}<br>
  <b>Name:</b> " . htmlspecialchars($name) . "<br>
  <b>Amount:</b> {$amtFmt}<br>
  <b>Email:</b> " . htmlspecialchars($email) . "<br>
  <b>Phone:</b> " . htmlspecialchars($phone) . "<br>
  <b>Message:</b> " . htmlspecialchars($message) . "</p>
  <p>Verify the payment, then send the official receipt &amp; 80G.</p>";
@mail($ADMIN_EMAIL, "New donation {$receipt} ({$amtFmt})", $adminBody, $adminHeaders);

/* ---- Respond ---- */
echo json_encode(["ok" => true, "receipt" => $receipt]);
