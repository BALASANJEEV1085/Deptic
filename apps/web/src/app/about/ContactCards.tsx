'use client';

import React, { useState } from 'react';

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="font-mono text-[#ffffff] hover:text-[#888888] transition-colors break-all active:scale-95 inline-block text-left"
    >
      {copied ? 'Copied!' : email}
    </button>
  );
}

export function ContactCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[24px]">
        <h3 className="text-[#ffffff] text-[18px] font-bold mb-4">General enquiries</h3>
        <CopyEmail email="contact@deptic.in" />
      </div>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[24px]">
        <h3 className="text-[#ffffff] text-[18px] font-bold mb-2">Security issues</h3>
        <p className="text-[#888888] text-[14px] mb-4">For responsible disclosure of vulnerabilities in Deptic itself</p>
        <CopyEmail email="security@deptic.in" />
      </div>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[10px] p-[24px]">
        <h3 className="text-[#ffffff] text-[18px] font-bold mb-2">Enterprise sales</h3>
        <p className="text-[#888888] text-[14px] mb-4">Custom plans, self-hosted deployment, dedicated support</p>
        <CopyEmail email="sales@deptic.in" />
      </div>
    </div>
  );
}
