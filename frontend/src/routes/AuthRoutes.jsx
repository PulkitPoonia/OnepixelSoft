import classNames from 'classnames';
import { AnimatePresence } from 'framer-motion';
import React, { Suspense } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import PageAnimate from '../components/Animation/PageAnimate';
import { authRoutes } from './AuthList';

const ClassicRoutes = () => {

    const location = useLocation();

    const token = localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
    const role = localStorage.getItem("role");

    // 🔥 BLOCK AUTH PAGES IF LOGGED IN
    if (token && role) {
        return (
            <Navigate
                to={role === "admin" ? "/admin/dashboard" : "/dashboard"}
                replace
            />
        );
    }

    const isLockScreen = location.pathname === "/auth/lock-screen";

    return (
        <AnimatePresence>
            <Suspense
                fallback={
                    <div className="preloader-it">
                        <div className="loader-pendulums" />
                    </div>
                }
            >
                <div
                    className={classNames("hk-wrapper hk-pg-auth", {
                        "bg-primary-dark-3": isLockScreen
                    })}
                    data-footer="simple"
                >
                    <Routes location={location}>
                        {authRoutes.map((obj, i) =>
                            obj.component ? (
                                <Route
                                    key={i}
                                    path={obj.path}
                                    element={
                                        <PageAnimate>
                                            <obj.component />
                                        </PageAnimate>
                                    }
                                />
                            ) : null
                        )}
                    </Routes>
                </div>
            </Suspense>
        </AnimatePresence>
    );
};

export default ClassicRoutes;
