import type { Metadata, Viewport } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { cn } from "@/lib/utils";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://deptic.netlify.app"),

  title: {
    default: "Deptic — Software Supply Chain Security & SBOM Generator",
    template: "%s | Deptic",
  },

  description:
    "Deptic automatically generates Software Bills of Materials (SBOMs), detects CVEs across every dependency, and proves NTIA EO14028 and EU CRA compliance. Free for developers. Supports npm, pip, Maven, Go, Rust, Ruby, PHP, .NET.",

  keywords: [
    "SBOM generator",
    "Software Bill of Materials",
    "CVE detection",
    "supply chain security",
    "NTIA EO14028 compliance",
    "EU Cyber Resilience Act",
    "CycloneDX generator",
    "SPDX generator",
    "dependency vulnerability scanner",
    "npm vulnerability scanner",
    "open source security",
    "software composition analysis",
    "SCA tool",
    "SBOM tool free",
    "dependency audit",
    "transitive dependency scanner",
    "GitHub security scanner",
    "OSV vulnerability database",
    "NVD CVE scanner",
    "PURL generator",
    "software supply chain compliance",
    "NTIA minimum elements",
    "CycloneDX 1.5",
    "SPDX 2.3",
    "Maven vulnerability scanner",
    "Go module security",
    "pip dependency scanner",
    "Java dependency audit",
    "Node.js security audit",
    "Python security scan",
    "deptic",
  ],

  authors: [{ name: "Balasanjeev C", url: "https://deptic.netlify.app" }],
  creator: "Balasanjeev C",
  publisher: "Deptic",

  category: "technology",

  classification: "Software Security Tool",

  applicationName: "Deptic",

  generator: "Next.js",

  referrer: "origin-when-cross-origin",

  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },

  manifest: "/manifest.json",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://deptic.netlify.app",
    siteName: "Deptic",
    title: "Deptic — Software Supply Chain Security & SBOM Generator",
    description:
      "Automatically generate SBOMs, detect CVEs across your entire dependency tree, and prove NTIA EO14028 and EU CRA compliance. Free to start. Supports 8 ecosystems.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Deptic — Software Supply Chain Security",
        type: "image/png",
      },
      {
        url: "/og-image-square.png",
        width: 600,
        height: 600,
        alt: "Deptic",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@deptic_io",
    creator: "@deptic_io",
    title: "Deptic — Software Supply Chain Security & SBOM Generator",
    description:
      "Scan any GitHub repo. Detect CVEs. Generate CycloneDX + SPDX SBOMs. Prove NTIA compliance. Free to start.",
    images: [
      {
        url: "/og-image.png",
        alt: "Deptic — Software Supply Chain Security",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "https://deptic.netlify.app",
    languages: {
      "en-US": "https://deptic.netlify.app",
    },
  },

  verification: {
    google: "googlece15b67278fc75cf",
  },

  other: {
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://deptic.netlify.app/#app",
      "name": "Deptic",
      "url": "https://deptic.netlify.app",
      "description": "Software supply chain security platform. Generate SBOMs, detect CVEs, prove NTIA and EU CRA compliance.",
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "Web",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free Plan",
          "price": "0",
          "priceCurrency": "INR",
          "description": "10 scans per day, CVE detection, CycloneDX export"
        },
        {
          "@type": "Offer",
          "name": "Enterprise Plan",
          "price": "999",
          "priceCurrency": "INR",
          "description": "25 scans per day, all ecosystems, PDF reports, Slack integration"
        }
      ],
      "featureList": [
        "SBOM Generation (CycloneDX 1.5, SPDX 2.3)",
        "CVE Vulnerability Detection",
        "NTIA EO14028 Compliance Scoring",
        "EU Cyber Resilience Act Compliance",
        "npm, pip, Maven, Go, Rust, Ruby, PHP, .NET support",
        "Automated Fix Pull Requests",
        "GitHub Actions Integration",
        "Real-time CVE Fix PR Generator"
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://deptic.netlify.app/#organization",
      "name": "Deptic",
      "url": "https://deptic.netlify.app",
      "logo": {
        "@type": "ImageObject",
        "url": "https://deptic.netlify.app/icon-512.png",
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://github.com/BALASANJEEV1085",
        "https://twitter.com/deptic_io"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "contact@deptic.in",
        "contactType": "customer support"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://deptic.netlify.app/#website",
      "url": "https://deptic.netlify.app",
      "name": "Deptic",
      "description": "Software supply chain security and SBOM generation platform",
      "publisher": {
        "@id": "https://deptic.netlify.app/#organization"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://deptic.netlify.app/docs?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is an SBOM?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A Software Bill of Materials (SBOM) is a complete inventory of all components in a software product including dependencies, versions, licenses, and vulnerability data. Required by US Executive Order 14028 and EU Cyber Resilience Act."
          }
        },
        {
          "@type": "Question",
          "name": "What is NTIA EO14028 compliance?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "US Executive Order 14028 requires software vendors selling to federal agencies to provide SBOMs with 7 minimum elements: supplier name, component name, version, unique identifiers, dependency relationships, SBOM author, and timestamp."
          }
        },
        {
          "@type": "Question",
          "name": "Does Deptic support private GitHub repositories?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Deptic uses GitHub OAuth to access private repositories you own. We only read manifest files — never your source code."
          }
        },
        {
          "@type": "Question",
          "name": "Which package ecosystems does Deptic support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Deptic supports npm (Node.js), pip (Python), Maven (Java), Go modules, Rust (Cargo), Ruby (Gemfile), PHP (Composer), and .NET (NuGet) — 8 ecosystems in total."
          }
        },
        {
          "@type": "Question",
          "name": "Is Deptic free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Deptic has a free plan with 10 scans per day, CVE detection, and CycloneDX + SPDX SBOM export. Enterprise plan is ₹999/month with 25 scans per day and additional features."
          }
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(syne.variable, dmSans.variable, dmMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)" }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
