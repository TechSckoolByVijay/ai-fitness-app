# Publishing Fitness Coach to Google Play

Written 2 September 2026. Everything in "Where things stand" was verified
live against the running system on that date; everything in the Play Console
sections is the process as of that date, and Google changes it, so treat the
Console's own wording as authoritative where the two disagree.

This is the whole path from here to an app on the Play Store. Part 1 is what
must change in the code and the accounts first. Parts 2–8 are the submission
itself, in order.

---

## Where things stand

**Verified working, 2 Sep 2026:**

| | |
|---|---|
| API | `fitness-coach-api` Container App, revision `--0000027`, healthy, `minReplicas: 1` so there is no cold start |
| AI provider | **Azure OpenAI**, confirmed at three levels — see below |
| Database | `fitness-coach-pg`, Postgres 16, Burstable B1ms |
| Legal pages | `/legal/privacy`, `/legal/terms`, `/legal/delete-account` all live and public |
| End-to-end | Registered a throwaway account against production, interpreted "two chapatis and a bowl of dahi", got a correct structured meal back with the clarifying question and bowl-size options, deleted the account (`204`) |

### Yes — you are on Azure OpenAI, not OpenAI

Confirmed three ways, because "it works" alone would not have distinguished
the two:

1. **The live Container App** sets `AI_PROVIDER=azure`,
   `AZURE_OPENAI_ENDPOINT=https://myopenaivijay.openai.azure.com/openai/v1`,
   `AZURE_OPENAI_DEPLOYMENT=gpt-5.6-luna`, key from the `ai-api-key-azure`
   secret.
2. **The code path that reads those** is
   `apps/api/src/providers/ai/ai-provider.factory.ts` — `AI_PROVIDER=azure`
   takes the first-class Azure branch, and `apps/api/src/config/env.ts`
   refuses to boot if any of the three Azure variables is missing while that
   branch is selected. There is no silent fallback to OpenAI.
3. **A direct call** to
   `https://myopenaivijay.openai.azure.com/openai/v1/responses` with the
   production key and the `gpt-5.6-luna` deployment returned `HTTP 200`.

No request leaves for `api.openai.com`. The switch itself was commit
`d39c320`, which had been sitting **unpushed** on your machine — the live
container had been flipped to `azure` by hand but the repo had not caught up.
That is now pushed and deployed, which also brought the curd/dahi pricing fix
live (verified above: dahi came back at 61 kcal/100 g, not 151).

Two pieces of leftover config on the container are harmless but misleading,
and worth tidying when you next touch it: `AI_BASE_URL` and `AI_API_KEY` are
still set to Azure values from the old `AI_PROVIDER=openai` arrangement. The
Azure branch ignores both. But they are the fallback provider's settings, so
if you ever flip `AI_PROVIDER=openai` — as PLAN.md's failover idea would —
you would send an Azure key to `api.openai.com` and get a 401.

### What I changed and pushed today

Commit `2e3549a`. All four were things that would have failed a submission:

- **Privacy policy said your data goes to OpenAI.** It goes to Azure OpenAI.
  The Data Safety form is a declaration you sign, so the page has to name the
  processor that actually receives the data. It now says Azure OpenAI, in a
  Microsoft data centre, no training on your data, not shared with OpenAI.
- **No public account-deletion page.** Play requires a URL a reviewer with no
  account can read. Added `/legal/delete-account`.
- **The `production` build profile had no `EXPO_PUBLIC_API_URL`.** A store
  build would have fallen through `client.ts`'s default chain to
  `http://localhost:4000` and failed every request on a real phone. It now
  names the Container App. Also pinned `buildType: app-bundle` and filled in
  `submit.production`.
- **`usesCleartextTraffic: true`** allowed plain HTTP in release builds and is
  gone; **`versionCode: 1`** is pinned for `autoIncrement` to count from.

---

## Part 1 — Blockers, before you submit anything

Five things. Two are code, three are accounts and forms.

### 1.1 Google Sign-In will break in production unless you add a SHA-1

This is the one that most often gets missed and it fails *after* release.

Play App Signing re-signs your app with **Google's** key, not the EAS upload
key. Your Android OAuth client
(`468817844738-aft6l5bpf75eeq54433j70i7g9b35i8v...`) is registered against
whichever SHA-1 you set up for the preview build. A production build signed by
Google presents a different fingerprint, the OAuth client rejects it, and
Google Sign-In fails with a bare `DEVELOPER_ERROR` on every device.

Fix, after you have created the app in Play Console (Part 4) and uploaded a
build once:

1. Play Console → your app → **Test and release → Setup → App signing**.
2. Copy the **SHA-1** under "App signing key certificate" (not the upload
   key certificate — you need both, but this is the one that is missing).
3. Google Cloud Console → **APIs & Services → Credentials** → the Android
   OAuth client → add that SHA-1 alongside the existing one, package name
   `com.fitnesscoach.mobile`.
4. Rebuild is not required; the change takes a few minutes to propagate.

Verify by signing in with Google from an internal-testing install, not from a
sideloaded APK — a sideloaded APK uses the upload key and will pass either way.

### 1.2 Decide Health Connect: declare it or cut it

The app requests four Health Connect permissions
(`apps/mobile/src/lib/healthConnect.ts`): Steps, Distance,
ActiveCaloriesBurned, SleepSession. PLAN.md records that this was built and
shipped but **never once run on a device**.

Health Connect access requires a separate declaration form in Play Console,
reviewed by hand, and it is one of the slower reviews. Requesting permissions
for a feature you have never seen work is the worst of both: you take the
review delay and you might ship a dead button.

Two honest options:

- **Cut it from v1.** Remove `react-native-health-connect` from the plugins
  list in `app.json` and hide `HealthConnectCard` from the Profile tab. No
  declaration form, no review delay. Add it back in 1.1 once you have tested
  it on a real phone.
- **Keep it.** Test it on a physical Android device with Health Connect
  installed *before* you submit, then fill in the declaration (Part 5.4).

I would cut it. It is the only thing on this list that costs review time for a
feature with zero device testing behind it, and it is a two-line revert.

### 1.3 Play Console developer account

$25, one time, at [play.google.com/console](https://play.google.com/console).

If you register as an **individual** rather than an organisation, expect
identity verification (government ID, sometimes a few days). Do this first —
it gates everything else and it is the only step with an unpredictable wait.

Note for later: personal developer accounts created after 13 Nov 2023 must run
a closed test with a minimum number of testers opted in for a continuous
period before they can apply for production access. It has been 12 testers for
14 days; Google has adjusted the numbers more than once, so read the exact
current requirement on the **Production → Apply for production access** page
rather than trusting this paragraph. Plan for **at least two weeks** between
your first upload and public availability, and start recruiting testers now.

### 1.4 A domain you control, for the privacy policy

Right now the privacy policy lives at
`https://fitness-coach-api.livelysand-91f7619e.centralus.azurecontainerapps.io/legal/privacy`.

Play accepts that URL. It is still a bad idea to launch on it: the hostname
contains an Azure-generated environment ID, and it changes if you ever
recreate the Container App environment. A dead privacy policy URL on a live
listing is a policy violation.

Buy a domain, point it at the Container App with a custom domain + managed
certificate (`az containerapp hostname add` / `bind`), and use
`https://yourdomain.com/legal/privacy` on the listing. An afternoon's work,
and it also gives you something to put in the listing's website field.

### 1.5 Store listing assets you do not have yet

You have `icon.png` at 1024×1024, which covers the Play icon. You need to
produce:

| Asset | Spec | Notes |
|---|---|---|
| Feature graphic | 1024×500 PNG/JPG, no alpha | Required. Shown at the top of your listing |
| Phone screenshots | 2–8, min 320px, max 3840px on any side, 16:9 or 9:16 | Required. Use real screens: Home, log a meal, the Coach, Insights, Profile |
| Short description | ≤ 80 chars | |
| Full description | ≤ 4000 chars | |

Optional but worth it: a 7-inch and 10-inch tablet screenshot set (`app.json`
declares `supportsTablet` for iOS only, so Android tablets are not a claim you
are making — skip unless you want the tablet listing).

Take the screenshots from a **production-profile build** on a real device, so
the data in them is real and the API URL is the live one.

---

## Part 2 — One-time setup

### 2.1 EAS credentials

EAS manages the Android keystore for you. On the first production build it
generates one and stores it. You do not need to do anything, but you should
back it up:

```bash
cd apps/mobile
eas credentials --platform android
```

Choose the production profile → **Download credentials**. Keep the keystore
and its passwords somewhere safe and offline. With Play App Signing enabled
this is only your *upload* key, so losing it is recoverable (Google can reset
it) — but recovery takes days.

### 2.2 Service account for `eas submit` (optional)

`eas.json` now points `submit.production.android.serviceAccountKeyPath` at
`../../secrets/play-service-account.json`. That file does not exist yet, and
you only need it if you want CLI submission rather than dragging the AAB into
the Console.

To create it: Play Console → **Setup → API access** → link a Google Cloud
project → create a service account → grant it *Release manager* on your app →
download the JSON key → save it to `secrets/play-service-account.json`.

**Add `secrets/` to `.gitignore` before you save that file.** It is a
credential that can publish to your store listing.

If you would rather upload by hand for the first few releases, that is
completely fine — delete the `submit` block or just ignore it.

---

## Part 3 — Build the release AAB

```bash
cd apps/mobile
eas build --platform android --profile production
```

What this does differently from the `preview` builds you have been making:

- produces an **`.aab`** (Android App Bundle), which is what Play requires,
  not an installable APK
- signs with the production keystore from 2.1
- bakes in `EXPO_PUBLIC_API_URL` pointing at the Container App
- `autoIncrement: true` bumps `versionCode` in `app.json` and writes it back —
  **commit that change**, or your next build reuses a number Play has already
  seen and the upload is rejected

Bump `version` in `app.json` by hand for each user-visible release (`1.0.3` →
`1.0.4`). `versionCode` is the number Play cares about; `version` is the one
users see.

The build runs on EAS's builders — the `build-android.yml` workflow's comments
explain why local and GitHub-runner builds were abandoned. Expect 15–25
minutes including queue.

**Before you upload it anywhere, install the AAB on a real phone** via
`bundletool` or by also running a `preview`-profile APK pointed at the same
production API. Confirm: sign in with email, sign in with Google, log a meal
by text, log one by photo, open the Coach, delete a test account. Every one of
those crosses the network to the live API, and this is your last chance to
catch a build-config mistake before a reviewer does.

---

## Part 4 — Create the app in Play Console

1. Play Console → **Create app**.
2. App name: **Fitness Coach**. Search Play for it first — it is a generic
   name and a near-collision hurts discoverability even when it is allowed.
3. Default language, **App** (not game), **Free**.
4. Accept the declarations, create.
5. **Test and release → Testing → Internal testing → Create new release** →
   upload the AAB.

Use **internal testing** for the first upload even though you will need closed
testing later (1.3). Internal testing has no review wait, so it is the fastest
way to get the app signing SHA-1 you need for 1.1 and to install a
Play-delivered build on your own phone.

Then fill in **Store listing** with the assets from 1.5.

---

## Part 5 — The declarations

This is where health apps get held up. Answer from what the code actually
does, not from what feels safest — a wrong declaration is a policy violation
even when the wrong answer is the more conservative one.

### 5.1 Data safety

Based on what the app collects and where it goes. Everything below is
"collected", none of it is "shared" for advertising or analytics, all of it is
"encrypted in transit", and all of it is deletable by the user.

| Data type | Collected | Purpose | Required? |
|---|---|---|---|
| Name, email address | Yes | Account management | Required |
| User IDs | Yes | Account management | Required |
| Health & fitness info (weight, height, DOB, sex, activity level, goals, conditions, allergies) | Yes | App functionality, personalisation | Required |
| Photos | Yes | App functionality (meal photos) | Optional |
| Voice or sound recordings | **No** — see below | | |
| Other user-generated content (meal/exercise/water/sleep logs, Coach messages) | Yes | App functionality | Required |
| Crash logs / diagnostics | Currently **no** — see 6.2 | | |

On voice: the app uses **on-device** speech recognition
(`expo-speech-recognition`, via `useVoiceRecognition.ts`). The transcript
reaches your server; the audio does not. `MOCK_SPEECH=true` on the server is
correct and deliberate — the server-side transcription path is unused. Declare
that the app does not collect audio recordings, and keep the `RECORD_AUDIO`
permission justified as on-device transcription.

Then the two required URLs:

- **Privacy policy:** `https://<your-domain>/legal/privacy`
- **Account deletion:** `https://<your-domain>/legal/delete-account`

### 5.2 Health apps declaration

You will be asked to confirm the app is not a medical device and does not
provide medical advice. Your Terms of Service already says exactly this in the
"What this app is not" section — quote it. Keep the disclaimer visible in-app,
not only in the Terms; Play checks.

### 5.3 Content rating, target audience, ads

- Content rating questionnaire: answer honestly, expect **Everyone** or
  **Everyone 10+**.
- Target audience: **18+**. Your privacy policy says the app is not directed
  at children under 16, and a health/fitness app aimed at any minor age
  bracket pulls in the Families policy programme. Keep it 18+.
- Ads: **No**. The app has none and the privacy policy says so.
- Government app: no. Financial features: no.

### 5.4 Health Connect declaration — only if you kept it (1.2)

A separate form, reviewed by hand. You must state each data type you read
(Steps, Distance, ActiveCaloriesBurned, SleepSession), why, and confirm you
do not use it for advertising. You will typically also need a short screen
recording showing the permission flow — which you cannot make until you have
run it on a device, which is exactly the problem in 1.2.

---

## Part 6 — Worth fixing, not strictly blocking

Ordered by how much they will cost you after launch.

### 6.1 No retry and no failover when the AI provider fails

PLAN.md records the 31 Aug incident: the `gpt-5.6-luna` deployment returned
`503 no healthy upstream` for hours and the app was unusable, because one 503
fails the whole request and nothing falls back. You fixed it by hand, at the
time, by editing environment variables.

That was survivable with no users. With users on the Play Store it is a
one-star review generator. Both providers are already fully configured and
`ai-provider.factory.ts` already knows how to build either — retry two or
three times with backoff, then fall back to the other provider, is a small
change against an existing seam. If you fix one thing on this list, fix this.

Same section, same cost, smaller change: the user-facing error says "try
again", which reads as though they phrased something badly. When the provider
is down it should say the service is temporarily unavailable.

### 6.2 Sentry is installed but silent

No DSN is configured, so `errorReportingEnabled` is false and nothing is
reported. `SENTRY_DISABLE_AUTO_UPLOAD: "true"` in all three build profiles
also means no source maps, so any stack trace you did get would be minified.

Launching without crash reporting means your only signal is Play's own crash
console and user reviews. Creating a Sentry account and setting the two DSNs
is an hour. Do it before launch if you can.

### 6.3 Calorie estimates vary run to run

Also from PLAN.md: the same plate returned 200 and 607 kcal, because the
`gpt-5.6-luna` deployment rejects `temperature`, so `openai.provider.ts` drops
it and the model samples at its default instead of the intended `0.1`.

This is a *visible* inconsistency in the app's core feature. It will show up
in reviews as "the numbers change every time". Worth checking whether a newer
Azure deployment of a different model honours `temperature`, since the code
path already handles both cases.

### 6.4 "TODA"

The Home card header is clipped and reads "TODA" instead of "TODAY". A
one-line fix that appears in your first screenshot.

### 6.5 Data export

Account deletion exists (Play requires it). Export does not. This is a GDPR
obligation the day anyone in the EU installs the app, and Play listings are
worldwide by default. Either restrict the release to countries where you are
comfortable, or add export.

### 6.6 OTA updates are off

`expo-updates` is configured with a production channel, but PLAN.md records
that OTA was rolled back to embedded after the white-screen incident and never
re-enabled. Every JS fix therefore costs a full build, an upload, and a Play
review.

Re-enabling it before launch means you can fix a bad bug in minutes instead of
a day. The update path is already fixed; it needs one careful test on a spare
device.

---

## Part 7 — Submit

1. Internal testing (Part 4) → confirm everything on your own phone, add the
   app signing SHA-1 (1.1), confirm Google Sign-In works.
2. **Closed testing** → recruit the required testers, run the required
   continuous period (1.3). Use it: this is where you will find whatever the
   emulator hid.
3. **Production → Apply for production access** once the closed-test
   requirement is satisfied. You write a short account of how testing went and
   what you changed.
4. **Production → Create new release** → upload → roll out. First review
   typically takes a few days; health apps sometimes longer.
5. Start at a **staged rollout** (20%), not 100%. If something is wrong you
   can halt it.

## Part 8 — After launch

- Watch **Play Console → Quality → Android vitals** for crash and ANR rates.
  Play will suppress your listing if either goes over the bad-behaviour
  threshold.
- Watch Azure costs. The Container App is `minReplicas: 1` so it bills
  continuously, the Postgres is Burstable B1ms, and Azure OpenAI is per-token
  with `AI_DAILY_INTERPRET_LIMIT=50` / `AI_DAILY_COACH_LIMIT=100` per user per
  day as your only ceiling. Do the arithmetic on what 100 users would cost
  before you have 100 users.
- Reply to reviews. Early ones set the tone of the listing.

---

## The short version

**Before you can submit at all:** Play Console account (start today — ID
verification is the long pole), decide Health Connect, a real domain for the
privacy policy, feature graphic and screenshots.

**Before your first production build is trustworthy:** add the Play app
signing SHA-1 to the Android OAuth client, or Google Sign-In will fail for
every real user.

**Before you would want strangers using it:** AI retry and failover (6.1) and
Sentry (6.2).

**Timeline:** the closed-testing requirement means at least two weeks between
your first upload and public availability, and probably three once review is
included. Nothing in Part 1 is more than a day's work — the calendar, not the
code, is what stands between you and the store.
