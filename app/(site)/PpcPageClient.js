"use client";

import Link from "next/link";
import InteriorPageLayout from "./InteriorPageLayout";

const HERO_BANNER_URL =
  "https://packschool.s3.us-east-1.amazonaws.com/PPCU+Website+branding.png";

function PromoCard({ href, title, imageUrl, eyebrow = "Get Started" }) {
  return (
    <Link
      href={href}
      className="block border border-black/20 overflow-hidden"
    >
      <img
        src={imageUrl}
        alt={title || eyebrow}
        className="h-[193px] w-full object-cover"
      />
      <div className="h-[50px] bg-[#1f1f1f] text-white flex items-center justify-center px-3">
        <span className="text-[16px] font-semibold leading-none">{title}</span>
      </div>
    </Link>
  );
}

export default function PpcPageClient() {
  return (
    <InteriorPageLayout activeItem="home">
      <section className="overflow-hidden border border-black/20">
        <img
          src={HERO_BANNER_URL}
          alt="PPC University banner"
          className="block w-full h-auto"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[48.72%_48.72%] lg:gap-[2.56%]">
        <div className="space-y-4 text-[14px] leading-[1.45] text-gray-800">
          <p className="max-w-[95%]">
            The Paperboard Packaging Council&apos;s member-exclusive learning platform for the
            folding carton industry.
          </p>
          <p className="max-w-[95%]">
            <strong>
              Built by and for the paperboard packaging industry, PPC University delivers the
              training your workforce needs to succeed.
            </strong>{" "}
            Whether you&apos;re onboarding new employees, developing skilled operators, or preparing
            the next generation of leaders, PPCU offers engaging, high-quality courses tailored to
            our industry&apos;s unique processes and challenges.
          </p>
          <h2 className="text-[24px] font-semibold leading-none tracking-tight text-[#1f2a44]">
            Why PPCU?
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-[14px]">
            <li>
              <strong>Onboard Faster</strong> — Give new hires a strong foundation in the folding
              carton industry.
            </li>
            <li>
              <strong>Upskill with Ease</strong> — Provide your workforce with practical, job-ready
              knowledge.
            </li>
            <li>
              <strong>Lead with Confidence</strong> — Support professional growth and leadership
              development.
            </li>
            <li>
              <strong>Maximize Your Membership</strong> — Enjoy exclusive access and preferred
              pricing as a PPC member.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <PromoCard
            href="/catalog"
            title="Folding Carton Essentials"
            imageUrl="https://9bac2b4aa80a4c6e49a5-dd043fb1e2aabe3b5f6da098455a781d.ssl.cf2.rackcdn.com/ppc_61ef8b62ee72cf473eabf19646dabb73.png"
          />
          <PromoCard
            href="/catalog"
            title="Preview PPCU"
            imageUrl="https://9bac2b4aa80a4c6e49a5-dd043fb1e2aabe3b5f6da098455a781d.ssl.cf2.rackcdn.com/ppc_779c29325fe6dfd2a9451c1a42858a7e.png"
            eyebrow="Check Out A"
          />
        </div>
      </section>

      <section className="border border-gray-300 bg-[#dddde1]">
        <div className="border-b border-gray-300 px-5 py-3">
          <h3 className="text-[17px] font-semibold leading-[1.15] text-[#1f1f1f]">
            PPC is currently a members only benefit. Interested in learning more about PPCU?
          </h3>
        </div>
        <div className="px-5 py-2.5">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-none bg-brand-green px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </InteriorPageLayout>
  );
}

