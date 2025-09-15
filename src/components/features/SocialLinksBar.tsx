import React from "react";
import { Instagram, Twitter, Facebook, Linkedin, Youtube } from "lucide-react";

export default function SocialLinksBar() {
  const socials = [
    { name: "Instagram", href: "https://instagram.com", Icon: Instagram },
    { name: "Twitter", href: "https://twitter.com", Icon: Twitter },
    { name: "Facebook", href: "https://facebook.com", Icon: Facebook },
    { name: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
    { name: "YouTube", href: "https://youtube.com", Icon: Youtube },
  ];

  const companyLinks = [
    { name: "About", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
    { name: "Privacy", href: "/privacy" },
  ];

  return (
    <section className="bg-white dark:bg-gray-900 border-t">
      <div className="container mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Follow us</span>
          <div className="flex items-center gap-2">
            {socials.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5"
                title={name}
              >
                <Icon className="w-4 h-4 text-gray-700 dark:text-gray-200" />
              </a>
            ))}
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {companyLinks.map(link => (
            <a key={link.name} href={link.href} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
              {link.name}
            </a>
          ))}
        </nav>

        <div className="md:hidden">
          <details>
            <summary className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">Company</summary>
            <div className="mt-2 flex flex-col gap-2">
              {companyLinks.map(link => (
                <a key={link.name} href={link.href} className="text-sm text-gray-600 dark:text-gray-300">
                  {link.name}
                </a>
              ))}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
