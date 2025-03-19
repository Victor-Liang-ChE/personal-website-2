import { redirect } from 'next/navigation';

// Only have one default export in this file
export default function RootPage() {
  redirect('/home');
}
