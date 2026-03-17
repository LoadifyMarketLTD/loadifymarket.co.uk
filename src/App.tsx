import { lazy, Suspense } from 'react';

const SellPage = lazy(() => import('./pages/SellPage'));

function App() {
    return (
        <Routes>
            {/* Other routes remain unchanged */}
            <Route path="sell" element={
                <Suspense fallback={<PageLoader />}> 
                    <SellPage />
                </Suspense>
            } />
        </Routes>
    );
}
export default App;