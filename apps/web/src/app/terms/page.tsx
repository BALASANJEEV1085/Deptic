'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function TermsPage() {
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
    { id: 'section-1', title: '1. The service' },
    { id: 'section-2', title: '2. Accounts' },
    { id: 'section-3', title: '3. Acceptable use' },
    { id: 'section-4', title: '4. API keys' },
    { id: 'section-5', title: '5. GitHub integration' },
    { id: 'section-6', title: '6. Intellectual property' },
    { id: 'section-7', title: '7. Service availability' },
    { id: 'section-8', title: '8. Disclaimers' },
    { id: 'section-9', title: '9. Limitation of liability' },
    { id: 'section-10', title: '10. Termination' },
    { id: 'section-11', title: '11. Refunds and cancellations' },
    { id: 'section-12', title: '12. Changes to these terms' },
    { id: 'section-13', title: '13. Governing law' },
    { id: 'section-14', title: '14. Contact' },
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
              Terms of Service
            </h1>
            <p className="text-[#888888] text-[16px] leading-[1.85] font-mono print:text-black">
              Effective date: June 10, 2026
            </p>
            <p className="text-[#888888] text-[16px] leading-[1.85] mt-6 print:text-black">
              These Terms of Service govern your use of Deptic and the services provided at deptic.in, our API, and our CLI tools. By creating an account or using Deptic, you agree to these terms. Please read them carefully.
            </p>
          </header>

          <div className="space-y-16">
            <section>
              <h2 id="section-1" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">1. The service</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                Deptic provides software supply chain security analysis including:
              </p>
              <ul className="list-disc pl-6 text-[#888888] text-[16px] leading-[1.85] space-y-2 mb-6 print:text-black">
                <li>Automated detection and resolution of software dependencies from source code manifest files</li>
                <li>Matching of dependencies against public vulnerability databases (OSV.dev, NVD)</li>
                <li>Generation of Software Bills of Materials (SBOMs) in CycloneDX 1.5 and SPDX 2.3 formats</li>
                <li>NTIA EO14028 and EU Cyber Resilience Act compliance scoring</li>
                <li>Automated vulnerability remediation via GitHub Pull Requests</li>
                <li>API and CLI access for integration into development workflows</li>
              </ul>
              <p className="text-[#888888] text-[16px] leading-[1.85] print:text-black">
                Deptic operates as a software-as-a-service platform hosted at deptic.in.
              </p>
            </section>

            <section>
              <h2 id="section-2" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">2. Accounts</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>2.1 You must create an account to use Deptic. Account creation requires a GitHub account.</p>
                <p>2.2 You are responsible for maintaining the security of your account credentials, API keys, and any tokens associated with your account.</p>
                <p>2.3 You must be at least 18 years old to create an account.</p>
                <p>2.4 You may not create accounts using automated means or create multiple accounts to circumvent usage limits.</p>
                <p>2.5 You are responsible for all activity that occurs under your account, including scans initiated by your API keys.</p>
              </div>
            </section>

            <section>
              <h2 id="section-3" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">3. Acceptable use</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                You may use Deptic only for lawful purposes. You agree not to:
              </p>
              <div className="space-y-4 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>3.1 Scan repositories you do not own or do not have explicit permission to scan. Scanning private repositories requires GitHub OAuth authorization from an account with access to that repository.</p>
                <p>3.2 Use Deptic to extract competitor intelligence, conduct unauthorized security research on third-party systems, or circumvent GitHub's API rate limits or terms of service.</p>
                <p>3.3 Attempt to reverse-engineer, decompile, or extract the Deptic scanning algorithms, CVE matching logic, or SBOM generation code.</p>
                <p>3.4 Use automated scripts to trigger scans at a rate that exceeds our published limits or that degrades service for other users.</p>
                <p>3.5 Use the Deptic API or CLI to scan repositories containing malware, exploit code, or content that violates applicable law.</p>
                <p>3.6 Share, sell, or sublicense API keys to third parties. API keys are personal and non-transferable.</p>
                <p>3.7 Misrepresent Deptic-generated SBOMs as produced by a different tool or organization in compliance filings.</p>
              </div>
            </section>

            <section>
              <h2 id="section-4" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">4. API keys</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>4.1 API keys issued by Deptic are single-use. Each key authorizes exactly one scan via the /api/scan-local or /api/scan-cli endpoints. After use, the key is permanently invalidated.</p>
                <p>4.2 API keys must not be committed to public source code repositories, included in public Docker images, or transmitted over unencrypted connections.</p>
                <p>4.3 If you suspect an API key has been compromised, revoke it immediately from Settings → API Keys. Deptic is not liable for scans triggered by compromised keys.</p>
                <p>4.4 API keys for CI/CD use should be stored as encrypted secrets in your CI/CD platform (e.g., GitHub Actions Secrets, GitLab CI Variables).</p>
              </div>
            </section>

            <section>
              <h2 id="section-5" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">5. GitHub integration</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>5.1 By connecting your GitHub account, you grant Deptic read access to repository file trees and manifest files for repositories you explicitly choose to scan.</p>
                <p>5.2 By enabling the Fix with PR feature, you authorize Deptic to create branches and open Pull Requests on repositories you own or have write access to. Deptic will only modify manifest files (package.json, pom.xml, go.mod, requirements.txt, etc.) — never source code files.</p>
                <p>5.3 By enabling webhook auto-scan, you authorize Deptic to register a webhook on specified repositories. You can revoke this at any time by disabling auto-scan in the Deptic dashboard or deleting the webhook directly in GitHub repository settings.</p>
                <p>5.4 Deptic's use of GitHub API is subject to GitHub's API Terms of Service. We use GitHub's API within published rate limits and do not cache repository data beyond what is necessary for scan completion.</p>
              </div>
            </section>

            <section>
              <h2 id="section-6" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">6. Intellectual property</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>6.1 Deptic and all its components — the scanning engine, frontend interface, API, and documentation — are the intellectual property of Balasanjeev C (the developer of Deptic). All rights reserved.</p>
                <p>6.2 The Deptic name, logo, and brand assets may not be used without explicit written permission.</p>
                <p>6.3 Your data remains yours. Scan results, SBOMs generated from your repositories, and compliance reports are owned by you. Deptic claims no ownership over content derived from your repositories.</p>
                <p>6.4 Vulnerability data sourced from OSV.dev is provided under the OSV data license. CVE data from NVD is public domain. PURL specifications are governed by the PURL specification working group.</p>
                <p>6.5 CycloneDX is a trademark of the CycloneDX project. SPDX is a trademark of the Linux Foundation. Deptic's use of these formats complies with their respective specifications and does not imply endorsement.</p>
              </div>
            </section>

            <section>
              <h2 id="section-7" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">7. Service availability</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 mt-6 print:text-black">
                7.1 Deptic is provided on an 'as available' basis. We do not guarantee 100% uptime.
              </p>
              <p className="text-[#888888] text-[16px] leading-[1.85] mb-4 print:text-black">
                7.2 Free tier accounts are subject to the following limits:
              </p>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse text-[#888888] text-[16px] print:text-black">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] print:border-gray-300">
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Limit</th>
                      <th className="py-3 px-4 font-semibold text-[#ffffff] print:text-black">Free tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Scans per month</td>
                      <td className="py-3 px-4">5</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Repositories per workspace</td>
                      <td className="py-3 px-4">5</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">Component history retention</td>
                      <td className="py-3 px-4">30 days</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">SBOM file storage</td>
                      <td className="py-3 px-4">100 MB</td>
                    </tr>
                    <tr className="border-b border-[#1a1a1a]/50 print:border-gray-200">
                      <td className="py-3 px-4">API keys</td>
                      <td className="py-3 px-4">3 active keys</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-4 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>7.3 We reserve the right to rate-limit, throttle, or suspend accounts that exceed usage limits or exhibit patterns consistent with abuse.</p>
                <p>7.4 Planned maintenance will be communicated via email or in-app notification where possible. Emergency maintenance may occur without advance notice.</p>
              </div>
            </section>

            <section>
              <h2 id="section-8" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">8. Disclaimers</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>8.1 Deptic scans known vulnerability databases but cannot guarantee detection of every vulnerability. New CVEs are published daily. A scan result of zero active threats means no CVEs were found in our data sources at the time of the scan — it does not guarantee your software is secure.</p>
                <p>8.2 SBOM completeness depends on the accuracy and completeness of manifest files in your repository. Deptic cannot detect dependencies that are not declared in supported manifest formats.</p>
                <p>8.3 Compliance scores are provided for informational purposes. A score of 100/100 indicates that Deptic found all 7 NTIA minimum elements in the generated SBOM. It does not constitute legal compliance certification. Consult a qualified compliance professional for regulatory submissions.</p>
                <p>8.4 Fix with PR recommendations are based on OSV.dev data at the time of the scan. Deptic verifies the recommended version against OSV before creating the PR, but cannot guarantee the recommended version is free of all security issues — including undisclosed vulnerabilities.</p>
                <p className="uppercase text-[#ffffff] font-bold print:text-black">8.5 DEPTIC IS PROVIDED 'AS IS' WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED.</p>
              </div>
            </section>

            <section>
              <h2 id="section-9" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">9. Limitation of liability</h2>
              <div className="space-y-4 mt-6 text-[#ffffff] font-bold text-[16px] leading-[1.85] uppercase print:text-black">
                <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DEPTIC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.</p>
                <p>OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM YOUR USE OF DEPTIC SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID FOR DEPTIC IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) USD $100.</p>
              </div>
            </section>

            <section>
              <h2 id="section-10" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">10. Termination</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>10.1 You may delete your account at any time from Settings → Profile → Delete Account. This permanently deletes all your data as described in our Privacy Policy.</p>
                <p>10.2 We may suspend or terminate accounts that violate these terms, with or without notice.</p>
                <p>10.3 Upon termination, your right to use Deptic ends immediately. Sections on Intellectual Property, Disclaimers, Limitation of Liability, and Governing Law survive termination.</p>
              </div>
            </section>

            <section>
              <h2 id="section-11" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">11. Refunds and cancellations</h2>
              <div className="space-y-4 mt-6 text-[#888888] text-[16px] leading-[1.85] print:text-black">
                <p>11.1 <strong>Cancellations:</strong> You may cancel your paid subscription at any time from your account settings. Cancellation will take effect at the end of your current billing cycle.</p>
                <p>11.2 <strong>Refunds:</strong> Since Deptic is a digital service, all purchases are final. We do not offer refunds or credits for partial billing periods or unused time.</p>
                <p>11.3 <strong>Exceptions:</strong> If you believe you were charged in error, please contact us within 7 days of the charge at balasnjeev1085@gmail.com. We will review requests on a case-by-case basis.</p>
              </div>
            </section>

            <section>
              <h2 id="section-12" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">12. Changes to these terms</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mt-6 print:text-black">
                We will notify users of material changes to these Terms of Service via email at least 14 days before they take effect. Continued use of Deptic after the effective date constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 id="section-13" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">13. Governing law</h2>
              <p className="text-[#888888] text-[16px] leading-[1.85] mt-6 print:text-black">
                These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of Deptic shall be subject to the exclusive jurisdiction of the courts of Andhra Pradesh, India.
              </p>
            </section>

            <section>
              <h2 id="section-14" className="font-syne text-[28px] font-bold text-[#ffffff] border-b border-[#1a1a1a] pb-4 mt-[56px] print:text-black print:border-gray-300">14. Contact</h2>
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
