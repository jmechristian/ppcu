'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import InteriorPageLayout from '../InteriorPageLayout';
import { useGrowthzoneProfile } from '../../providers/GrowthzoneProfileContext';

function progressLabel(value) {
  if (value == null) return 'Progress unavailable';
  if (value <= 0) return 'Not started';
  if (value >= 100) return 'Completed';
  return `${value}% complete`;
}

export default function LearningPage() {
  const { profile } = useGrowthzoneProfile();
  const isLoggedIn = profile.status === 'ready';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [takeError, setTakeError] = useState('');
  const [takingCourseId, setTakingCourseId] = useState('');

  const email = useMemo(
    () =>
      String(profile.email || '')
        .trim()
        .toLowerCase(),
    [profile.email],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLearning() {
      if (!isLoggedIn || !email) {
        setCourses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await fetch(
          `/api/thinkific/my-learning?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            cache: 'no-store',
          },
        );
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(json?.error || `Request failed (${response.status})`);
        }
        if (!cancelled) {
          setCourses(
            Array.isArray(json?.data?.courses) ? json.data.courses : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load your learning dashboard.');
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLearning();
    return () => {
      cancelled = true;
    };
  }, [email, isLoggedIn]);

  async function handleTakeCourse(course) {
    const resumeUrl = String(course?.resumeUrl || '').trim();
    if (!resumeUrl || takingCourseId) return;

    const firstName = String(profile.firstName || '').trim();
    const lastName = String(profile.lastName || '').trim();
    const contactId = Number(profile.contactId);
    const contactName = String(
      profile.name || `${firstName} ${lastName}`.trim(),
    ).trim();

    if (!email || !firstName || !lastName) {
      setTakeError('Missing profile data required to launch this course.');
      return;
    }

    setTakeError('');
    setTakingCourseId(course.id);
    try {
      const response = await fetch('/api/thinkific/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          contact_id:
            Number.isFinite(contactId) && contactId > 0 ? contactId : null,
          contact_name: contactName,
          return_to: resumeUrl,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.url) {
        throw new Error(json?.error || 'Unable to launch the course.');
      }
      window.location.assign(json.url);
    } catch (err) {
      setTakeError(err?.message || 'Unable to launch the course.');
      setTakingCourseId('');
    }
  }

  return (
    <InteriorPageLayout activeItem='learning'>
      <section className='min-h-[520px] border border-gray-300 bg-white p-5 sm:p-6'>
        <header className='space-y-3 border-b border-gray-200 pb-4'>
          <h1 className='text-3xl font-semibold leading-tight text-[#1f2a44]'>
            My Learning
          </h1>
          <p className='max-w-3xl text-[15px] leading-relaxed text-gray-700'>
            View your PPCU enrollments and progress across your courses.
          </p>
          {takeError && (
            <div className='rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
              {takeError}
            </div>
          )}
        </header>

        {!isLoggedIn ? (
          <div className='mt-6 rounded border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700'>
            <p>You need to be logged in to view your learning dashboard.</p>
            <Link
              href='/login'
              className='mt-3 inline-flex items-center rounded bg-brand-green px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110'
            >
              Log In
            </Link>
          </div>
        ) : loading ? (
          <div className='mt-6 space-y-4 animate-pulse'>
            <div className='h-24 rounded border border-gray-200 bg-gray-100' />
            <div className='h-24 rounded border border-gray-200 bg-gray-100' />
            <div className='h-24 rounded border border-gray-200 bg-gray-100' />
          </div>
        ) : error ? (
          <div className='mt-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : courses.length === 0 ? (
          <div className='mt-6 rounded border border-gray-200 bg-gray-50 px-5 py-6'>
            <h2 className='text-lg font-semibold text-gray-900'>
              No Enrollments Yet
            </h2>
            <p className='mt-2 text-sm text-gray-700'>
              You are not enrolled in any PPCU courses yet. Visit the catalog to
              enroll and your courses will appear here.
            </p>
            <Link
              href='/catalog'
              className='mt-4 inline-flex items-center rounded bg-brand-green px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110'
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <ul className='mt-6 space-y-3'>
            {courses.map((course) => {
              const progress = course.progressPercent;
              const safeProgress =
                progress == null ? 0 : Math.min(Math.max(progress, 0), 100);
              return (
                <li
                  key={course.id}
                  className='rounded border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                >
                  <div className='flex flex-col gap-4 sm:flex-row'>
                    <div className='h-[92px] w-full shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 sm:w-[150px]'>
                      {course.cardImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.cardImageUrl}
                          alt={course.title}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          Course
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between sm:gap-4'>
                        <div className='min-w-0 sm:flex-1'>
                          <h2 className='text-[18px] font-semibold text-gray-900'>
                            {course.title}
                          </h2>
                          <p className='mt-1 text-sm text-gray-600'>
                            {course.instructor
                              ? `Instructor: ${course.instructor}`
                              : 'Instructor: TBD'}
                          </p>
                        </div>
                        {course.resumeUrl && (
                          <button
                            type='button'
                            onClick={() => handleTakeCourse(course)}
                            disabled={Boolean(takingCourseId)}
                            className='inline-flex self-start items-center rounded bg-brand-green px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:shrink-0'
                          >
                            {takingCourseId === course.id
                              ? 'Launching...'
                              : Number(course.progressPercent || 0) > 0
                                ? 'Resume Course'
                                : 'Take Course'}
                          </button>
                        )}
                      </div>
                      <div className='mt-3'>
                        <div className='mb-1 flex items-center justify-between text-xs text-gray-600'>
                          <span>{progressLabel(progress)}</span>
                          <span>
                            {progress == null ? '--' : `${safeProgress}%`}
                          </span>
                        </div>
                        <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
                          <div
                            className='h-full rounded-full bg-brand-green transition-all'
                            style={{ width: `${safeProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </InteriorPageLayout>
  );
}
