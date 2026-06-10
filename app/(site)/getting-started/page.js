'use client';

import InteriorPageLayout from '../InteriorPageLayout';

export default function GettingStartedPage() {
  return (
    <InteriorPageLayout activeItem='getting-started'>
      <div className='space-y-12 pb-16'>
        <section className='w-full flex flex-col gap-5 pr-3'>
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Getting Started
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            PPC University (PPCU) is the Paperboard Packaging Council’s
            dedicated learning hub for the folding carton industry. Through a
            robust online platform, PPCU delivers industry-specific knowledge,
            practical skills, and essential processes to strengthen today’s
            workforce and prepare tomorrow’s leaders. Serving as both a training
            resource and a professional development pathway, PPCU also supports
            member recruitment and retention. Programming will be offered to
            both members and non-members, with PPC members receiving priority
            access and preferred pricing as an exclusive benefit.
          </p>
        </section>
        <section className='w-full flex flex-col gap-5'>
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Folding Carton Essentials
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            Folding Carton Essentials provides a comprehensive introduction to
            the materials, processes, and technologies used to manufacture
            folding cartons. Through a series of self-paced lessons,
            participants follow the complete lifecycle of a folding carton—from
            paperboard production and recovered fiber systems to printing,
            converting, finishing, and final package assembly.
          </p>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            Designed for professionals both inside and outside of manufacturing,
            this course builds a practical understanding of how folding cartons
            are made and the terminology, equipment, and decision-making
            involved throughout the process. Participants will explore topics
            including virgin and recycled paperboard, sustainability, color
            theory, inks and coatings, adhesives, tooling, die-cutting,
            laminating, window patching, microflute applications, rigid boxes,
            printing technologies, and emerging industry innovations.
          </p>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            Whether you work in operations, sales, customer service, marketing,
            design, procurement, quality, or leadership, understanding the
            folding carton manufacturing process provides valuable context for
            collaborating with customers, suppliers, and production teams. By
            the end of the course, participants will have a strong foundation in
            the technical concepts and industry language that drive the
            paperboard packaging industry.
          </p>
          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>Course Objectives</h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              Upon completion of this course, participants will be able to:
            </p>
            <ul className='list-disc space-y-1 pl-5 text-gray-700 max-w-3xl'>
              <li>
                Explain the complete folding carton manufacturing process from
                paperboard production through finished packaging.
              </li>
              <li>
                Identify the characteristics and applications of virgin fiber,
                recycled fiber, and recovered fiber systems.
              </li>
              <li>
                Understand the role of sustainability in paperboard packaging
                and how materials and manufacturing processes contribute to
                environmental performance.
              </li>
              <li>
                Recognize the major paperboard grades and determine appropriate
                applications for each.
              </li>
              <li>
                Describe the fundamentals of printing technologies used in
                folding carton production.
              </li>
              <li>
                Understand the principles of color theory, color management, and
                print quality.
              </li>
              <li>
                Identify common coatings, laminates, and finishing techniques
                and their impact on package performance and appearance.
              </li>
              <li>
                Explain the purpose and function of adhesives used throughout
                the converting process.
              </li>
              <li>
                Understand the role of tooling, die-cutting, creasing, and other
                converting operations.
              </li>
              <li>
                Describe specialty applications including window patching,
                microflute packaging, and rigid box construction.
              </li>
              <li>
                Interpret common folding carton terminology and communicate more
                effectively with industry professionals.
              </li>
              <li>
                Recognize how various departments—including sales, customer
                service, design, marketing, procurement, and operations—interact
                with and support the folding carton manufacturing process.
              </li>
            </ul>
          </div>
        </section>
        <section className='w-full flex flex-col gap-5'>
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Frequently Asked Questions{' '}
          </h2>
          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full my-2'>
              Getting Started
            </h3>
            <div className='w-full flex flex-col gap-1.5'>
              <p>
                <strong>How do I access PPCU?</strong>
              </p>
              <p>
                Log in to your PPC member account through GrowthZone. Once
                logged in, you’ll see a link to PPC University (PPCU) in your
                member dashboard, which will bring you into the LMS platform.
              </p>
              <p>
                <strong>
                  Do I need a separate username or password for PPCU?
                </strong>
              </p>
              <p>
                No. Your GrowthZone login credentials automatically grant you
                access. If you’re already logged into GrowthZone, you’ll be
                taken directly to the PPCU platform.
              </p>
              <p>
                <strong>I’m not a PPC member. Can I access PPCU?</strong>
              </p>
              <p>
                At this time, PPCU is a PPC member benefit. If you are
                interested in becoming a PPC member, reach out to our team at
                info@paperbox.org
              </p>
            </div>
          </div>
          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full my-2'>
              Courses & Content
            </h3>
            <div className='w-full flex flex-col gap-1.5'>
              <p>
                <strong>What kind of training does PPCU offer?</strong>
              </p>
              <p>
                PPCU delivers industry-specific training modules on folding
                carton manufacturing, design, printing, tooling, and more.
                Programs range from introductory lessons to advanced skill
                development.
              </p>
              <p>
                <strong>How do I enroll in a course?</strong>
              </p>
              <p>
                Once logged into PPCU, browse the course catalog. Click “Enroll”
                to register for a module or program. If it’s a member benefit,
                you’ll get immediate access. If a fee applies, you’ll be
                prompted to complete payment.
              </p>
              <p>
                <strong>Is PPCU self-paced?</strong>
              </p>
              <p>
                Yes. All online modules are self-paced, allowing you to start
                and stop as needed. Your progress is automatically saved.
              </p>
            </div>
          </div>
          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full my-2'>
              Navigation & Platform Help
            </h3>
            <div className='w-full flex flex-col gap-1.5'>
              <p>
                <strong>How do I access PPCU?</strong>
              </p>
              <p>
                Log in to your PPC member account through GrowthZone. Once
                logged in, you’ll see a link to PPC University (PPCU) in your
                member dashboard, which will bring you into the PPCU platform.
                You can also directly access the platform here.
              </p>
              <p>
                <strong>
                  Do I need a separate username or password for PPCU?
                </strong>
              </p>
              <p>
                No. Your GrowthZone login credentials automatically grant you
                access. If you’re already logged into GrowthZone, you’ll be
                taken directly to the PPCU platform.
              </p>
              <p>
                <strong>I’m not a PPC member. Can I access PPCU?</strong>
              </p>
              <p>
                Yes, non-members may purchase access at varying tuition levels.
                Members always receive priority access and preferred pricing as
                a benefit of membership.
              </p>
            </div>
          </div>
          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full my-2'>
              Technical Support
            </h3>
            <div className='w-full flex flex-col gap-1.5'>
              <p>
                <strong>What internet browser works best with PPCU?</strong>
              </p>
              <p>
                We recommend the latest versions of Chrome, Firefox, or Edge.
                Safari is supported, but Internet Explorer is not.
              </p>
              <p>
                <strong>Can I access PPCU on mobile devices?</strong>
              </p>
              <p>
                Yes. PPCU is mobile-responsive and can be accessed via
                smartphone or tablet browsers.
              </p>
              <p>
                <strong>I forgot my password. What do I do?</strong>
              </p>
              <p>
                Reset your password through your GrowthZone account. Once
                updated, use the new credentials to access PPCU.
              </p>
              <p>
                <strong>Who do I contact for technical issues?</strong>
              </p>
              <p>
                For login or membership issues, contact PPC staff at
                janice@paperbox.org For platform-specific problems (video
                playback, course loading), use the “Help” or “Support” button
                within the PPCU platform.
              </p>
            </div>
          </div>
        </section>
      </div>
    </InteriorPageLayout>
  );
}
