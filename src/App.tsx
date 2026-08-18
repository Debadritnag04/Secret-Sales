/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Lobby from './pages/Lobby';
import Auction from './pages/Auction';
import Team from './pages/Team';
import Standings from './pages/Standings';
import PlayerPool from './pages/PlayerPool';
import Results from './pages/Results';

export default function App() {
  return (
    <>
      <Toaster theme="dark" position="top-center" />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<CreateRoom />} />
          <Route path="join" element={<JoinRoom />} />
          <Route path="lobby" element={<Lobby />} />
          <Route path="auction" element={<Auction />} />
          <Route path="team" element={<Team />} />
          <Route path="standings" element={<Standings />} />
          <Route path="pool" element={<PlayerPool />} />
          <Route path="results" element={<Results />} />
        </Route>
      </Routes>
    </>
  );
}
