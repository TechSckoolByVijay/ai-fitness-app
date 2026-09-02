const LAST_UPDATED = 'August 27, 2026';
const APP_NAME = 'Fitness Coach';
const CONTACT_EMAIL = 'vijaysainiprofessional@gmail.com';

const PAGE_STYLES = `
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 20px 80px; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 1.7rem; margin-bottom: 4px; }
  h2 { font-size: 1.2rem; margin-top: 2em; }
  .updated { color: #666; font-size: 0.9rem; margin-bottom: 2em; }
  ul { padding-left: 1.3em; }
  li { margin-bottom: 0.4em; }
  a { color: #146b3f; }
`;

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${APP_NAME}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

export function privacyPolicyHtml(): string {
  return page(
    'Privacy Policy',
    `
<h1>Privacy Policy</h1>
<p class="updated">Last updated: ${LAST_UPDATED}</p>

<p>${APP_NAME} ("we", "us") is a fitness and nutrition tracking app. This page explains what
information we collect, how it's used, and the choices you have. We built this app to help
you track your own health and fitness journey — we don't sell your data, and we don't show ads.</p>

<h2>Information we collect</h2>
<ul>
  <li><strong>Account information:</strong> your name, email address, and a securely hashed
  password (we never store your actual password — it's one-way hashed and cannot be reversed,
  including by us).</li>
  <li><strong>Profile and goals:</strong> date of birth, sex, height, weight, activity level,
  and the fitness goal(s) you select.</li>
  <li><strong>Diet, allergy, and health information:</strong> diet preference, any allergies you
  report, and any general health conditions you choose to share (e.g. diabetes, blood pressure).
  This is used only to keep the app's suggestions relevant and safe for you — for example, to
  avoid suggesting a dish you're allergic to.</li>
  <li><strong>Things you log:</strong> meals, exercise, water, sleep, and weight entries — as
  text, voice, or photos you choose to submit.</li>
  <li><strong>Conversations with the AI Coach:</strong> messages you send to get meal
  suggestions or ask questions.</li>
</ul>

<h2>How your information is used</h2>
<p>Your logged meals, activities, and messages to the Coach are sent to
<strong>Azure OpenAI</strong> — Microsoft's hosted version of the OpenAI models, running in
a Microsoft data centre — to be interpreted into structured data (e.g. turning "I ate two
chapatis" into a calorie/protein estimate) or to generate a Coach reply. Microsoft does not use
this data to train models, and it is not shared with OpenAI. Food names are also sent to the
<strong>USDA FoodData Central</strong> public database to look up nutrition values. Your account
data and logs are stored on <strong>Microsoft Azure</strong>, which hosts our database and
servers. None of these providers are permitted to use your data for their own purposes beyond
providing the service to us.</p>

<p>We do not sell your data to anyone, and we do not use it for advertising.</p>

<h2>Your choices</h2>
<ul>
  <li>You can edit your profile, goals, diet, allergies, and health conditions at any time from
  the Profile tab — nothing you enter during onboarding is locked in.</li>
  <li>You can permanently delete your account and all associated data at any time from
  Profile → Danger Zone. This is immediate and cannot be undone — see
  <a href="/legal/delete-account">Delete your account</a> for the full list of what is removed
  and what to do if you can no longer sign in.</li>
  <li>To request a copy of your data, or ask us anything about this policy, email
  <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</li>
</ul>

<h2>Data security</h2>
<p>Passwords are hashed (never stored in plain text), all traffic to our servers is encrypted
(HTTPS), and access to your account requires a signed authentication token. We restrict our
database to only accept connections from our own backend, not the open internet.</p>

<h2>Children's privacy</h2>
<p>${APP_NAME} is not directed at children under 16, and we do not knowingly collect
information from them. If you believe a child has provided us information, contact us and
we'll remove it.</p>

<h2>Changes to this policy</h2>
<p>If this policy changes materially, we'll update the date above. Continued use of the app
after a change means you accept the updated policy.</p>

<h2>Contact</h2>
<p>Questions about this policy or your data: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`,
  );
}

export function termsOfServiceHtml(): string {
  return page(
    'Terms of Service',
    `
<h1>Terms of Service</h1>
<p class="updated">Last updated: ${LAST_UPDATED}</p>

<p>By using ${APP_NAME}, you agree to these terms. Please read them, especially the section on
what this app is (and isn't) below.</p>

<h2>What this app is</h2>
<p>${APP_NAME} is a general fitness, nutrition, and wellness tracking tool. It helps you log
meals and activity, understand your progress, and get general lifestyle suggestions from an
AI Coach.</p>

<h2>What this app is not — please read this</h2>
<p><strong>${APP_NAME} is not a medical device, and nothing in the app — including calorie/
macro estimates, progress insights, or AI Coach replies — is medical advice, a diagnosis, or a
treatment recommendation.</strong> The app does not know your full medical history and cannot
account for it beyond what you choose to enter. Always talk to a qualified healthcare provider
before making significant changes to your diet or exercise routine, especially if you have a
health condition, are pregnant, or are managing a medical concern.</p>

<p>Nutrition and calorie information in the app — whether from voice, text, or photo — is an
<strong>estimate</strong>, not a precise or verified measurement. Do not rely on it for
managing a medical condition (e.g. insulin dosing) without independent verification.</p>

<h2>Your account</h2>
<ul>
  <li>You're responsible for keeping your login credentials secure.</li>
  <li>You must provide accurate information when creating your account.</li>
  <li>You can delete your account at any time from Profile → Danger Zone.</li>
</ul>

<h2>Acceptable use</h2>
<p>Don't use the app to submit content that is unlawful, abusive, or that infringes someone
else's rights. We may suspend or terminate accounts that misuse the service.</p>

<h2>AI-generated content</h2>
<p>Meal interpretations, nutrition estimates, and Coach replies are generated with the help of
AI models and may occasionally be inaccurate or incomplete. Always review and correct an
estimate (the app's sliders and edit options exist for exactly this) if it doesn't look right
before relying on it.</p>

<h2>No warranty, limitation of liability</h2>
<p>The app is provided "as is," without warranty of any kind. To the fullest extent permitted
by law, we are not liable for any damages arising from your use of the app, including
decisions made based on its estimates or suggestions.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms from time to time. Continued use of the app after a change means
you accept the updated terms.</p>

<h2>Contact</h2>
<p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`,
  );
}

/**
 * Play Console's Data Safety form has a required "account deletion URL" field
 * for any app that supports account creation, and it must be reachable from
 * outside the app — a reviewer with no account has to be able to read it.
 * In-app deletion (Profile → Danger Zone) is the actual mechanism; this page
 * documents it and gives the email fallback for someone who has lost access
 * to their account and so cannot reach the in-app path at all.
 */
export function deleteAccountHtml(): string {
  return page(
    'Delete your account',
    `
<h1>Delete your account and data</h1>
<p class="updated">Last updated: ${LAST_UPDATED}</p>

<p>You can permanently delete your ${APP_NAME} account, and everything stored with it, at any
time. There is no waiting period and no retention window — deletion is immediate and cannot be
undone.</p>

<h2>From inside the app</h2>
<ol>
  <li>Open ${APP_NAME} and go to the <strong>Profile</strong> tab.</li>
  <li>Scroll to the <strong>Danger zone</strong> card.</li>
  <li>Tap <strong>Delete account</strong> and confirm with your password.</li>
</ol>
<p>You are signed out straight away and the account no longer exists.</p>

<h2>If you cannot sign in</h2>
<p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> from the address on the account
and ask for it to be deleted. We will confirm once it is done.</p>

<h2>What gets deleted</h2>
<p><strong>Everything, permanently.</strong> Your account and profile (name, email, hashed
password, date of birth, sex, height, weight, activity level, goals), your diet, allergy and
health-condition entries, every meal, exercise, water, sleep and weight log, your saved
favourites and preferences, and your full Coach conversation history.</p>
<p>Nothing is kept after deletion. Routine server backups and logs age out on their own
schedule and are never used to restore a deleted account.</p>

<h2>Questions</h2>
<p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`,
  );
}
