import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SwipeWrapper = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [[page, direction], setPage] = useState([0, 0]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define swipeable routes in order
  const swipeableRoutes = ['/chats', '/group', '/search', '/calendar'];
  const currentIndex = swipeableRoutes.indexOf(location.pathname);
  const isSwipeablePath = currentIndex !== -1;

  useEffect(() => {
    if (isSwipeablePath) {
      setPage(prev => {
        const prevIndex = prev[0];
        return [currentIndex, currentIndex > prevIndex ? 1 : -1];
      });
    }
  }, [location.pathname, isSwipeablePath, currentIndex]);

  if (!isSwipeablePath || isDesktop) {
    return (
      <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
        {children}
      </div>
    );
  }

  const handleDragEnd = (e, { offset, velocity }) => {
    const swipe = offset.x;
    const velocityX = Math.abs(velocity.x);
    const swipePower = Math.abs(swipe) * velocityX;

    const threshold = 50; 
    const velocityThreshold = 200;
    const powerThreshold = 500;

    if (swipe < -threshold && (swipePower > powerThreshold || velocityX > velocityThreshold)) {
      if (currentIndex < swipeableRoutes.length - 1) {
        navigate(swipeableRoutes[currentIndex + 1]);
      }
    } else if (swipe > threshold && (swipePower > powerThreshold || velocityX > velocityThreshold)) {
      if (currentIndex > 0) {
        navigate(swipeableRoutes[currentIndex - 1]);
      }
    }
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    })
  };

  return (
    <div style={{ 
      position: 'relative', 
      height: '100%', 
      width: '100%', 
      overflow: 'hidden'
    }}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 400, damping: 38 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            overflowY: 'hidden',
            touchAction: 'pan-y'
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SwipeWrapper;