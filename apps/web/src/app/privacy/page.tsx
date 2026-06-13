'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -80% 0px' }
    );

    const sections = document.querySelectorAll('h2[id]');
    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const sections = [
    { id: 'section-1', title: '1. Information we collect' },
    { id: 'section-2', title: '2. How we use your information' },
    { id: 'section-3', title: '3. Data sharing' },
    { id: 'section-4', title: '4. Data retention' },
    { id: 'section-5', title: '5. Your rights' },
    { id: 'section-6', title: '6. Security' },
    { id: 'section-7', title: '7. Cookies' },
    { id: 'section-8', title: '8. Changes to this policy' },
    { id: 'section-9', title: '9. Contact' },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff] font-sans selection:bg-white/10 selection:text-white flex flex-col">
      <Navbar />


      <main className="flex-1 relative max-w-[1400px] mx-auto w-full px-6 md:px-10 pt-16 pb-32 flex justify-center">
        
        {/* Content Column */}
        <div className="w-full max-w-[760px] print:w-full print:max-w-none print:text-black">
          <header className="mb-16">
            <div className="inline-block bg-[#111111] border border-[#1a1a1a] rounded-full px-3 py-1 text-[#888888] text-[12px] font-mono mb-6 print:hidden">
              Last updated: June 10, 2026
            </div>
            <h1 className="font-syne text-[48px] font-bold tracking-tight text-[#ffffff] mb-6 leading-tight print:text-black">
              Privacy Policy
            </h1>
            <p className="text-[#888888] text-[16px] leading-[1.85] font-mono print:text-black">
              Effective date: June 10, 2026
            </p>
            <p className="text-[#888888] text-[16px] leading-[1.85] mt-6 print:text-black">
              This Privacy Policy describes how Deptic ("we", "us", "our") collects, uses, and protects information when you use the Deptic software supply chain security platform at deptic.in and through our API and CLI tools. We are committed to protecting your privacy and being transparent about our data practices.
            </p>
          </header>

          <div className="space-y-16">
            <section>
              <h2 id="section-1" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">1. Information we collect</h2>
              
              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.1 Account information</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                When you sign up using GitHub OAuth, we receive from GitHub:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Your GitHub username and display name</li>
                <li>Your primary email address registered with GitHub</li>
                <li>Your GitHub user ID (used as your unique identifier in Deptic)</li>
                <li>Your public profile avatar URL</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                We do not receive your GitHub password. We do not store your GitHub OAuth token beyond your active session.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.2 Repository data</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                When you initiate a scan, Deptic accesses:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Manifest files only: package.json, requirements.txt, pyproject.toml, pom.xml, go.mod, Cargo.toml, Gemfile, composer.json, and equivalent files</li>
                <li>The repository file tree (list of file paths) to locate manifest files</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                We do NOT access, read, or store:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Your source code</li>
                <li>Configuration files (.env, application.yml, secrets)</li>
                <li>Non-manifest files of any kind</li>
                <li>Private repository contents beyond manifest files</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Manifest file contents are processed in memory to resolve dependency trees and are not persisted after scanning completes. Structured component data (package name, version, license, PURL) is stored in our database.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.3 Scan results</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                We store the following structured data from scans:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Package name, version, ecosystem, license, and Package URL (PURL) for each resolved component</li>
                <li>CVE identifiers and severity scores for detected vulnerabilities</li>
                <li>NTIA compliance scores and element coverage data</li>
                <li>Scan metadata: repository URL, scan timestamp, duration, status</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Generated SBOM files (CycloneDX JSON, SPDX, PDF) are stored in encrypted object storage (iDrive E2) with a unique key per file. Share links to SBOM files expire after the duration you set (30–180 days). API-triggered scan files expire after 1 hour.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.4 Technical data</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                We automatically collect:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>IP address (used for rate limiting and abuse prevention, not linked to your identity in logs)</li>
                <li>Browser type and version (from User-Agent header)</li>
                <li>Operating system (used to name push notification subscriptions)</li>
                <li>Pages visited within the Deptic dashboard (for product analytics)</li>
                <li>Timestamps of scan creation, completion, and report exports</li>
              </ul>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.5 Push notification subscriptions</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                If you enable browser push notifications, we store:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Your push subscription endpoint URL (provided by your browser)</li>
                <li>Encryption keys (p256dh and auth values) required to encrypt push payloads</li>
                <li>Device name (derived from User-Agent)</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Push notification content is encrypted end-to-end between our server and your browser. We cannot read notification content after delivery.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">1.6 Webhook data</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                If you enable auto-scan via GitHub webhooks, we store:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>GitHub webhook ID for each registered webhook</li>
                <li>A randomly generated HMAC secret per webhook (used to verify GitHub signatures)</li>
                <li>Push event metadata: branch name, commit SHA, pusher username, timestamp</li>
                <li>We do NOT store the full GitHub webhook payload beyond the metadata listed above</li>
              </ul>
            </section>

            <section>
              <h2 id="section-2" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">2. How we use your information</h2>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 mt-6 print:text-black">
                <li>To provide the Deptic service: resolving dependencies, detecting CVEs, generating SBOMs, producing compliance reports</li>
                <li>To authenticate your identity and authorize access to your scans and workspace</li>
                <li>To register and verify GitHub webhooks for auto-scan functionality</li>
                <li>To send push notifications for scan completion, vulnerability alerts, and account security events</li>
                <li>To enforce rate limits and prevent abuse of the API and scan infrastructure</li>
                <li>To improve Deptic: understanding which features are used, scan durations, error rates</li>
                <li>To respond to support requests and security reports</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                We do not use your data for advertising. We do not sell your data to third parties. We do not use your repository data to train machine learning models.
              </p>
            </section>

            <section>
              <h2 id="section-3" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">3. Data sharing</h2>
              
              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">3.1 Infrastructure providers</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse text-[#888888] text-[16px] print:text-black">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] print:border-gray-300">
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Provider</th>
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Purpose</th>
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Data shared</th>
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Supabase</td>
                      <td className="py-3 px-4">Database and authentication</td>
                      <td className="py-3 px-4">Account data, scan results</td>
                      <td className="py-3 px-4">EU (Frankfurt)</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Upstash</td>
                      <td className="py-3 px-4">Redis caching</td>
                      <td className="py-3 px-4">Temporary scan cache (TTL 24h)</td>
                      <td className="py-3 px-4">EU/US</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">iDrive E2</td>
                      <td className="py-3 px-4">SBOM file storage</td>
                      <td className="py-3 px-4">SBOM files, PDF reports</td>
                      <td className="py-3 px-4">US</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Resend</td>
                      <td className="py-3 px-4">Transactional email</td>
                      <td className="py-3 px-4">Email address, notification content</td>
                      <td className="py-3 px-4">US</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Vercel</td>
                      <td className="py-3 px-4">Frontend hosting</td>
                      <td className="py-3 px-4">Page requests, static assets</td>
                      <td className="py-3 px-4">Global CDN</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Railway</td>
                      <td className="py-3 px-4">API hosting</td>
                      <td className="py-3 px-4">API requests</td>
                      <td className="py-3 px-4">US</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">3.2 GitHub</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                Deptic communicates with the GitHub API to:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Fetch repository file trees and manifest file contents during scans</li>
                <li>Register and manage webhooks on repositories where you enable auto-scan</li>
                <li>Create branches and Pull Requests when you use Fix with PR</li>
                <li>Read your repository list when you connect to the Projects page</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                This communication uses OAuth tokens issued during your GitHub sign-in. Tokens are used only during active operations and are not stored persistently beyond your session.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">3.3 Vendor sharing portal</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                When you generate a share link for an SBOM report, the recipient can view the report without an account. You control the expiry of share links. We log view counts and timestamps for share links. The recipient's IP address is logged for security purposes.
              </p>

              <h3 className="text-[#ffffff] text-[18px] font-semibold mt-[32px] mb-4 print:text-black">3.4 Workspace members</h3>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Scan results, vulnerability data, and compliance reports are visible to all members of a shared workspace. When you create a workspace and invite members, those members can see all scans initiated within that workspace.
              </p>
            </section>

            <section>
              <h2 id="section-4" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">4. Data retention</h2>
              <div className="overflow-x-auto mb-6 mt-6">
                <table className="w-full text-left border-collapse text-[#888888] text-[16px] print:text-black">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] print:border-gray-300">
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Data type</th>
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Retention period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Account data</td>
                      <td className="py-3 px-4">Until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Scan metadata</td>
                      <td className="py-3 px-4">Until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Component inventory</td>
                      <td className="py-3 px-4">Until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">CVE data</td>
                      <td className="py-3 px-4">Until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">SBOM files (dashboard)</td>
                      <td className="py-3 px-4">Until account deletion</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">SBOM files (API/CLI scan)</td>
                      <td className="py-3 px-4">1 hour from generation</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Share link files</td>
                      <td className="py-3 px-4">Until link expiry date (max 180 days)</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Webhook event logs</td>
                      <td className="py-3 px-4">90 days</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Push notification log</td>
                      <td className="py-3 px-4">30 days</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Deleted account data</td>
                      <td className="py-3 px-4">Purged within 30 days of deletion</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Redis cache entries (temporary scan data) expire automatically per their TTL — typically 24 hours for component metadata, 6 hours for clean version data.
              </p>
            </section>

            <section>
              <h2 id="section-5" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">5. Your rights</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                Depending on your location, you may have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Right to access: request a copy of all data Deptic holds about you</li>
                <li>Right to deletion: delete your account and all associated data at Settings → Profile → Delete Account. Deletion is permanent and cannot be undone.</li>
                <li>Right to portability: export your scan history and SBOM files before deleting your account</li>
                <li>Right to correction: update your profile information at Settings → Profile</li>
                <li>Right to object: opt out of product analytics by contacting privacy@deptic.in</li>
                <li>Right to withdraw consent: disable push notifications at any time in Settings → Notifications</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                To exercise any right, email privacy@deptic.in. We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 id="section-6" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">6. Security</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                Deptic implements the following security controls:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>All data transmitted over HTTPS/TLS 1.3</li>
                <li>Database encrypted at rest (Supabase AES-256)</li>
                <li>SBOM files stored with server-side encryption (AES-256)</li>
                <li>API keys stored as SHA-256 hashes — plaintext is never persisted</li>
                <li>GitHub webhook payloads verified using HMAC-SHA256 signatures</li>
                <li>Push notification payloads encrypted end-to-end (Web Push standard)</li>
                <li>Row-level security on database tables — users can only access their own data</li>
                <li>JWT tokens expire after 1 hour and are refreshed automatically</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                If you discover a security vulnerability in Deptic, please email security@deptic.in. We will acknowledge within 48 hours and aim to resolve within 14 days.
              </p>
            </section>

            <section>
              <h2 id="section-7" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">7. Cookies</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                Deptic uses minimal cookies:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Authentication cookie: set by Supabase to maintain your login session. Expires when you sign out or after 7 days of inactivity. This cookie is strictly necessary — the service cannot function without it.</li>
                <li>No advertising cookies</li>
                <li>No cross-site tracking cookies</li>
                <li>No third-party analytics cookies</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                We do not use Google Analytics, Mixpanel, Segment, or any behavioral analytics platform that tracks you across the web.
              </p>
            </section>

            <section>
              <h2 id="section-8" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">8. Changes to this policy</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mt-6 print:text-black">
                We will notify users of material changes to this Privacy Policy via email and in-app notification at least 14 days before changes take effect. Continued use of Deptic after the effective date constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 id="section-9" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">9. Contact</h2>
              <ul className="text-[#888888] text-[16px] leading-[1.85] space-y-2 mt-6 print:text-black">
                <li>Contact me: <a href="mailto:balasnjeev1085@gmail.com" className="text-[#ffffff] hover:underline font-mono ml-2 print:text-black">balasnjeev1085@gmail.com</a></li>
                
              </ul>
            </section>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="hidden xl:block absolute right-10 top-16 w-[280px] print:hidden">
          <div className="sticky top-32">
            <h4 className="text-[#ffffff] text-[14px] font-bold uppercase tracking-widest mb-6">On this page</h4>
            <nav className="flex flex-col space-y-3">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`text-[14px] transition-colors ${
                    activeSection === s.id
                      ? 'text-[#ffffff] font-medium'
                      : 'text-[#888888] hover:text-[#ffffff]'
                  }`}
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </div>

      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
