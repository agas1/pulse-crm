import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function MainLayout() {
  return (
    <div className="min-h-screen w-full">
      <TopBar />
      <div className="pt-14">
        <Outlet />
      </div>
    </div>
  );
}
