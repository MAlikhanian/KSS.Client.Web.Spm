import { redirect } from 'next/navigation';

/**
 * /spm has no landing screen of its own — the operations queue is the entry
 * point, since that is where an operator starts their day.
 */
export default function SpmPage() {
  redirect('/requests');
}
