import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login page or dashboard based on authentication
  redirect('/auth/login');
}