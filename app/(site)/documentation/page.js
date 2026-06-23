'use client';

import {
  FaRegImage,
  FaUserShield,
  FaUsersCog,
  FaExclamationTriangle,
} from 'react-icons/fa';
import InteriorPageLayout from '../InteriorPageLayout';
import { useGrowthzoneProfile } from '../../providers/GrowthzoneProfileContext';
import { canViewDocs } from '../../lib/doc-access';

// To add a screenshot, set `src` to an image URL or a path under /public
// (e.g. src="/docs/enroll.png"). While `src` is empty, a placeholder is shown.
function Screenshot({ src, label, caption }) {
  return (
    <figure className='w-full py-3'>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className='w-full rounded-lg border border-gray-200'
        />
      ) : (
        <div className='flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50'>
          <div className='flex flex-col items-center gap-2 px-4 text-center'>
            <FaRegImage className='h-8 w-8 text-gray-400' aria-hidden='true' />
            <span className='text-sm font-semibold text-gray-500'>{label}</span>
            <span className='text-xs uppercase tracking-wide text-gray-400'>
              Screenshot placeholder
            </span>
          </div>
        </div>
      )}
      {caption ? (
        <figcaption className='mt-2 text-sm text-gray-500'>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Callout({ title, children }) {
  return (
    <div className='flex gap-3 border-l-4 border-brand-green bg-green-50 p-4'>
      <FaExclamationTriangle
        className='mt-0.5 h-5 w-5 shrink-0 text-brand-green'
        aria-hidden='true'
      />
      <div className='space-y-1'>
        {title ? <p className='font-semibold text-gray-900'>{title}</p> : null}
        <div className='text-gray-700 leading-snug'>{children}</div>
      </div>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <li className='flex gap-3'>
      <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white'>
        {number}
      </span>
      <div className='space-y-1'>
        <p className='font-semibold text-gray-900'>{title}</p>
        <p className='text-gray-700 leading-snug'>{children}</p>
      </div>
    </li>
  );
}

function RoleCard({ icon, title, tagline, children }) {
  return (
    <div className='flex flex-col gap-3 border-4 border-[#2a2a2a] bg-white p-5'>
      <div className='flex items-center gap-3'>
        <span className='text-brand-green'>{icon}</span>
        <div>
          <h4 className='text-lg font-semibold text-gray-900'>{title}</h4>
          <p className='text-sm text-gray-600'>{tagline}</p>
        </div>
      </div>
      <div className='text-gray-700 leading-snug'>{children}</div>
    </div>
  );
}

const PARTS = [
  { href: '#enrollment', label: '1. Enrollment' },
  { href: '#management', label: '2. Management' },
  { href: '#experience', label: '3. User Experience' },
];

export default function DocumentationPage() {
  const { profile } = useGrowthzoneProfile();
  const isLoading = profile.status === 'loading' || profile.status === 'idle';
  const allowed = canViewDocs(profile);

  if (!allowed) {
    return (
      <InteriorPageLayout activeItem='documentation'>
        <div className='space-y-6 pb-16'>
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Documentation
          </h2>
          {isLoading ? (
            <p className='text-gray-500'>Checking access…</p>
          ) : (
            <div className='flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3'>
              <FaUserShield
                className='h-5 w-5 shrink-0 text-amber-600'
                aria-hidden='true'
              />
              <p className='text-sm font-semibold text-amber-900'>
                This documentation is restricted to PPCU staff. If you believe
                you should have access, contact the PPCU team.
              </p>
            </div>
          )}
        </div>
      </InteriorPageLayout>
    );
  }

  return (
    <InteriorPageLayout activeItem='documentation'>
      <div className='space-y-12 pb-16'>
        <div className='flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3'>
          <FaUserShield
            className='h-5 w-5 shrink-0 text-amber-600'
            aria-hidden='true'
          />
          <p className='text-sm font-semibold text-amber-900'>
            This documentation is intended for PPCU staff only.
          </p>
        </div>

        <section className='w-full flex flex-col gap-5 pr-3'>
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Documentation
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            This guide explains how the PPC University (PPCU) platform works end
            to end: how learners are enrolled, how Primary Users and Staff
            Admins manage people, and what the everyday experience looks like
            for a learner. It is broken into three parts.
          </p>
          <nav className='flex flex-wrap gap-2'>
            {PARTS.map((part) => (
              <a
                key={part.href}
                href={part.href}
                className='rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-100'
              >
                {part.label}
              </a>
            ))}
          </nav>
        </section>

        {/* PART 1 — ENROLLMENT */}
        <section
          id='enrollment'
          className='w-full flex flex-col gap-5 scroll-mt-24'
        >
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Part 1 — Enrollment
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            Enrollment always begins inside the PPCU environment. Before a
            learner can be enrolled, they must be authenticated through
            GrowthZone — that GrowthZone identity is the single source of truth
            for who the user is. From there, the platform provisions everything
            needed in the learning management system (LMS) automatically.
          </p>

          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full'>
              The primary enrollment path
            </h3>
            <ol className='space-y-4'>
              <Step number={1} title='Authenticate through GrowthZone'>
                The learner signs in via GrowthZone. Their login is always tied
                to GrowthZone, never to the LMS directly. There is no separate
                LMS username or password to remember.
              </Step>
              <Step number={2} title='We create the LMS account'>
                On enrollment, PPCU automatically creates the learner&apos;s
                account in the LMS behind the scenes — no manual account setup
                is required.
              </Step>
              <Step number={3} title='Single sign-on (SSO) into the course'>
                The learner is signed into the LMS automatically through SSO.
                Because authentication flows from GrowthZone, the learner moves
                straight into their course without a second login.
              </Step>
            </ol>
          </div>

          <Callout title='GrowthZone is the login of record'>
            The learner&apos;s identity and login are always tied to GrowthZone
            — not the LMS. As long as enrollment happens through PPCU, the
            GrowthZone account and the LMS account stay correctly linked.
          </Callout>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>The enroll screen</h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              This is the{' '}
              <code className='rounded bg-gray-100 px-1.5 py-0.5'>/enroll</code>{' '}
              route, where the authenticated GrowthZone user begins the
              enrollment process.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/enroll.png'
              label='/enroll route'
              caption='The PPCU enrollment screen.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>Landing in the LMS</h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              After enrollment, the learner is SSO&apos;d directly into the LMS
              and can start their course immediately.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/lms.png'
              label='LMS course view'
              caption='The learner inside the LMS course.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>
              My Learning — the return hub
            </h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              My Learning is where learners come back to resume their course. It
              is the home base for picking up exactly where they left off, every
              time they return to PPCU.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/mylearning.png'
              label='My Learning page'
              caption='Where learners return to resume progress.'
            />
          </div>
        </section>

        {/* PART 2 — MANAGEMENT */}
        <section
          id='management'
          className='w-full flex flex-col gap-5 scroll-mt-24'
        >
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Part 2 — Management
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            Management capabilities are driven by two trigger roles. A
            user&apos;s role determines what they can see and do in the Admin
            area of PPCU.
          </p>

          <div className='grid gap-5 md:grid-cols-2'>
            <RoleCard
              icon={<FaUsersCog className='h-7 w-7' aria-hidden='true' />}
              title='Primary User'
              tagline='Manages related contacts'
            >
              A Primary User can manage the contacts related to their
              organization — viewing their enrollment status and enrolling
              related contacts into the program directly from PPCU.
            </RoleCard>
            <RoleCard
              icon={<FaUserShield className='h-7 w-7' aria-hidden='true' />}
              title='Staff Admin'
              tagline='Searches and enrolls any user'
            >
              A Staff Admin can search across all GrowthZone contacts and enroll
              any user, in addition to viewing the full roster of active
              learners and their progress.
            </RoleCard>
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>Primary User view</h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              The Primary User&apos;s Admin view, showing their related contacts
              and the ability to manage and enroll them.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/primaryuser.png'
              label='Admin — Primary User view'
              caption='Managing related contacts as a Primary User.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>Staff Admin view</h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              The Staff Admin&apos;s Admin view, showing the active learner
              roster plus search across all GrowthZone contacts with one-click
              enrollment.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/staff.png'
              label='Admin — Staff Admin view'
              caption='Searching and enrolling any contact as a Staff Admin.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>
              Tracking in GrowthZone
            </h3>
            <p className='text-gray-700 leading-snug max-w-3xl'>
              Once enrolled, staff can manage and track learners directly in
              GrowthZone, where certification progress is recorded alongside the
              member record.
            </p>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/growthzone.png'
              label='GrowthZone — learner management'
              caption='Managing and tracking enrolled learners in GrowthZone.'
            />
          </div>

          <Callout title='Enroll inside PPCU — always'>
            Enrollment must happen in the PPCU environment for the system to
            work correctly. PPCU is what links the GrowthZone contact to the LMS
            account and certification. Enrolling a learner directly in the LMS
            or GrowthZone outside of PPCU will leave the records disconnected.
          </Callout>
        </section>

        {/* PART 3 — USER EXPERIENCE */}
        <section
          id='experience'
          className='w-full flex flex-col gap-5 scroll-mt-24'
        >
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Part 3 — User Experience
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            For the learner, everything happens in the PPCU environment. There
            is no new login to create and nothing to set up separately. As long
            as the enrollment process happens inside PPCU, the learner always
            stays within the PPCU ecosystem — sign in, enroll, and use My
            Learning as the hub to continue their progress.
          </p>

          <div className='w-full flex flex-col gap-3'>
            <h3 className='text-xl font-semibold w-full'>
              The learner journey
            </h3>
            <ol className='space-y-4'>
              <Step number={1} title='Sign in'>
                The learner signs in through GrowthZone — the same credentials
                they already use. No new account, no extra password.
              </Step>
              <Step number={2} title='Enroll'>
                Enrollment happens inside PPCU, which provisions the LMS account
                and signs the learner in automatically.
              </Step>
              <Step number={3} title='Continue in My Learning'>
                My Learning is the hub the learner returns to in order to resume
                and complete their course at their own pace.
              </Step>
            </ol>
          </div>

          <Callout title='Staff receive an approval email'>
            When a user registers, PPCU staff receive an approval email. No
            action is needed if the learner is good to continue — the email is
            simply a notification that a new learner has entered the program.
          </Callout>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>Enroll</h3>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/enroll.png'
              label='/enroll route'
              caption='The learner starts inside PPCU.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>My Learning</h3>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/mylearning.png'
              label='My Learning page'
              caption='The hub for continuing progress.'
            />
          </div>

          <div className='w-full flex flex-col gap-2'>
            <h3 className='text-xl font-semibold w-full'>The LMS</h3>
            <Screenshot
              src='https://packschool.s3.us-east-1.amazonaws.com/lms.png'
              label='LMS course view'
              caption='Course delivery within the PPCU ecosystem.'
            />
          </div>
        </section>

        {/* REMAINING TASKS */}
        <section
          id='remaining-tasks'
          className='w-full flex flex-col gap-5 scroll-mt-24'
        >
          <h2 className='text-2xl font-semibold w-full pb-3 border-b border-gray-700'>
            Remaining Tasks
          </h2>
          <p className='text-gray-700 leading-snug max-w-3xl'>
            One item remains before the platform is fully live. Once production
            is stable and testing has been approved, the site needs to be
            attached to the paperbox.org subdomain. The final outcome is for
            PPCU to live at{' '}
            <code className='rounded bg-gray-100 px-1.5 py-0.5'>
              ppcu.paperbox.org
            </code>
            , so learners and staff access the platform under the Paperboard
            Packaging Council&apos;s own domain.
          </p>
          <Callout title='Pending: attach the ppcu.paperbox.org subdomain'>
            After production and testing are approved, point the{' '}
            <code className='rounded bg-white px-1.5 py-0.5'>
              ppcu.paperbox.org
            </code>{' '}
            subdomain to this site as the final go-live step.
          </Callout>
        </section>
      </div>
    </InteriorPageLayout>
  );
}
