import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './screens/Home/Home';
import { MissionActive } from './screens/Mission/MissionActive';
import { PostMission } from './screens/PostMission/PostMission';
import { OnboardingFlow } from './screens/Onboarding/OnboardingFlow';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/mission" element={<MissionActive />} />
        <Route path="/post-mission" element={<PostMission />} />
      </Routes>
    </Router>
  );
}

export default App;
