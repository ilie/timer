import React from "react";

const Footer = () => {
  const fullYear = new Date().getFullYear();
  return (
    <footer className="shrink-0 bg-white px-8 py-3">
      <a
        className="text-sm text-linguaskill-slate-400 no-underline transition-colors hover:text-linguaskill-slate-700"
        href="https://www.vlec.es"
      >
        <p>Virginia Lyons Exam Centre © {fullYear}</p>
      </a>
    </footer>
  );
};

export default Footer;
