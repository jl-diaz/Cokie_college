import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ImageBackground, Image, Platform, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/utils/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function EasterEggScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [highScore, setHighScore] = useState(0);
  const [globalRecord, setGlobalRecord] = useState(0); 
  const [globalRecordHolder, setGlobalRecordHolder] = useState('Anónimo');
  const [newRecordType, setNewRecordType] = useState(null);

  const [gameDimensions, setGameDimensions] = useState(() => ({ 
    width: Dimensions.get('window').width, 
    height: Dimensions.get('window').height 
  }));
  const screenWidth = gameDimensions.width;
  const screenHeight = gameDimensions.height;

  // Actualizar dimensiones si la ventana cambia de tamaño (en PC/Web o rotación en móvil)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (window.width > 0 && window.height > 0) {
        setGameDimensions({ width: window.width, height: window.height });
      }
    });
    return () => subscription?.remove();
  }, []);

  // Load initial records (weekly global record and personal record)
  const loadRecords = useCallback(async () => {
    try {
      const localScore = await AsyncStorage.getItem('flappyHighScore');
      if (localScore !== null) {
        setHighScore(parseInt(localScore, 10));
      }
      
      // Calculate start of current week (Monday 00:00:00)
      const now = new Date();
      const diff = (now.getDay() + 6) % 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      // Fetch global record for current week
      const { data, error } = await supabase
        .from('flappy_scores')
        .select('score, user_name, created_at')
        .gte('created_at', startOfWeek.toISOString())
        .order('score', { ascending: false })
        .limit(1);
        
      if (!error && data && data.length > 0) {
        setGlobalRecord(data[0].score);
        setGlobalRecordHolder(data[0].user_name || 'Anónimo');
      } else {
        setGlobalRecord(0);
        setGlobalRecordHolder('Nadie aún');
      }
    } catch (e) {
      console.warn('Error loading records', e);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const GRAVITY = 0.35;
  const JUMP = -6.5;
  const OBSTACLE_WIDTH = 70;
  const OBSTACLE_SPEED = 3.5;
  const BIRD_WIDTH = 58;
  const BIRD_HEIGHT = 56;
  const HITBOX_MARGIN = 10;

  const birdY = useRef(screenHeight / 2);
  const birdVelocity = useRef(0);
  const birdAnimY = useRef(new Animated.Value(screenHeight / 2)).current;
  const birdRotAnim = useRef(new Animated.Value(0)).current;

  const obstacles = useRef([]);
  const [obstacleList, setObstacleList] = useState([]);
  const requestRef = useRef(null);
  const lastTimeRef = useRef(0);

  const spawnObstacle = (currentWidth, currentHeight) => {
    const currentGap = 220; // Fixed gap to prevent phantom collision zones
    const minHeight = Math.min(80, currentHeight * 0.15);
    const maxHeight = currentHeight - currentGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    const animX = new Animated.Value(currentWidth);
    const newObs = {
      id: `${Date.now()}_${Math.random()}`,
      x: currentWidth,
      topHeight: topHeight,
      gap: currentGap,
      passed: false,
      animX
    };
    obstacles.current.push(newObs);
    setObstacleList([...obstacles.current]);
  };

  const jump = () => {
    if (!isPlaying && !isGameOver) {
      setIsPlaying(true);
      obstacles.current = [];
      setObstacleList([]);
      spawnObstacle(screenWidth, screenHeight);
    }
    if (isGameOver) {
      resetGame();
    } else {
      birdVelocity.current = JUMP;
    }
  };

  const resetGame = () => {
    setIsGameOver(false);
    setIsPlaying(true);
    scoreRef.current = 0;
    setScore(0);
    setNewRecordType(null);
    birdY.current = screenHeight / 2;
    birdVelocity.current = 0;
    birdAnimY.setValue(screenHeight / 2);
    birdRotAnim.setValue(0);
    obstacles.current = [];
    setObstacleList([]);
    lastTimeRef.current = 0;
    spawnObstacle(screenWidth, screenHeight);
    loadRecords();
  };

  const gameLoop = (timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    let timeScale = deltaTime / 16.666;
    if (timeScale > 3) timeScale = 3;
    if (timeScale < 0.1) timeScale = 0.1;
    if (isNaN(timeScale)) timeScale = 1;

    if (isPlaying && !isGameOver) {
      birdVelocity.current += GRAVITY * timeScale;
      birdY.current += birdVelocity.current * timeScale;

      birdAnimY.setValue(birdY.current);
      const rot = Math.min(Math.max(birdVelocity.current * 2.5, -25), 45);
      birdRotAnim.setValue(rot);

      let needsListUpdate = false;

      for (let i = 0; i < obstacles.current.length; i++) {
        let obs = obstacles.current[i];
        obs.x -= OBSTACLE_SPEED * timeScale;
        obs.animX.setValue(obs.x);

        // Collision logic with margin of error
        const hitTop = birdY.current + HITBOX_MARGIN < obs.topHeight;
        const hitBottom = birdY.current + BIRD_HEIGHT - HITBOX_MARGIN > obs.topHeight + obs.gap;
        const hitX = obs.x < screenWidth / 2 + BIRD_WIDTH / 2 - HITBOX_MARGIN && obs.x + OBSTACLE_WIDTH > screenWidth / 2 - BIRD_WIDTH / 2 + HITBOX_MARGIN;

        if (hitX && (hitTop || hitBottom)) {
          triggerGameOver();
        }

        // Score logic
        if (obs.x + OBSTACLE_WIDTH < screenWidth / 2 - BIRD_WIDTH / 2 && !obs.passed) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
          obs.passed = true;
        }
      }

      if (birdY.current > screenHeight || birdY.current < 0) {
        triggerGameOver();
      }

      if (obstacles.current.length > 0 && obstacles.current[0].x < -OBSTACLE_WIDTH) {
        obstacles.current.shift();
        needsListUpdate = true;
      }
      
      const lastObs = obstacles.current[obstacles.current.length - 1];
      if (lastObs && lastObs.x < screenWidth - 250) {
        spawnObstacle(screenWidth, screenHeight);
      } else if (needsListUpdate) {
        setObstacleList([...obstacles.current]);
      }
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const triggerGameOver = async () => {
    setIsGameOver(true);
    let isNewGlobal = false;
    let isNewPersonal = false;
    const finalScore = scoreRef.current;

    if (finalScore > globalRecord) {
      isNewGlobal = true;
      setGlobalRecord(finalScore);
      setGlobalRecordHolder(profile?.full_name?.split(' ')[0] || 'Anónimo');
    }
    
    if (finalScore > highScore) {
      isNewPersonal = true;
      setHighScore(finalScore);
      try {
        await AsyncStorage.setItem('flappyHighScore', finalScore.toString());
      } catch (e) {}
    }

    if (isNewGlobal) {
      setNewRecordType('global');
      try {
        const userName = profile?.full_name?.split(' ')[0] || 'Anónimo';
        await supabase.from('flappy_scores').insert([{ score: finalScore, user_name: userName }]);
      } catch (e) {}
    } else if (isNewPersonal) {
      setNewRecordType('personal');
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, isGameOver, screenWidth, screenHeight]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
          e.preventDefault();
          jump();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlaying, isGameOver, screenWidth, screenHeight]);

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      style={styles.container} 
      onPress={jump} 
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setGameDimensions({ width, height });
          if (!isPlaying) {
            birdY.current = height / 2;
            birdAnimY.setValue(height / 2);
          }
        }
      }}
    >
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      <ImageBackground 
        source={require('../src/assets/GalaxyBG.jfif')} 
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        {!isPlaying && !isGameOver && (
          <View style={styles.startOverlay}>
            <Text style={styles.startText}>{t('easterEgg.tapToPlay', 'Toca o presiona Espacio para jugar')}</Text>
          </View>
        )}

        <Text style={styles.scoreText}>{score}</Text>

        {obstacleList.map((obs) => {
          const bottomHeight = Math.max(0, screenHeight - obs.topHeight - obs.gap);
          return (
            <Animated.View 
              key={obs.id} 
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: OBSTACLE_WIDTH,
                transform: [{ translateX: obs.animX }],
                zIndex: 4,
              }}
            >
              <View style={[styles.pipe, styles.pipeTop, { width: OBSTACLE_WIDTH, height: obs.topHeight }]}>
                <View style={styles.pipeEnergyLine} />
                <View style={[styles.pipeCap, styles.pipeCapBottomEdge]} />
              </View>
              <View style={[styles.pipe, styles.pipeBottom, { width: OBSTACLE_WIDTH, height: bottomHeight, bottom: 0 }]}>
                <View style={styles.pipeEnergyLine} />
                <View style={[styles.pipeCap, styles.pipeCapTopEdge]} />
              </View>
            </Animated.View>
          );
        })}

        <Animated.Image 
          source={require('../src/assets/CokieAstronauta.png')} 
          style={[styles.bird, { 
            left: screenWidth / 2 - BIRD_WIDTH / 2, 
            width: BIRD_WIDTH, 
            height: BIRD_HEIGHT,
            transform: [
              { translateY: birdAnimY },
              {
                rotate: birdRotAnim.interpolate({
                  inputRange: [-25, 45],
                  outputRange: ['-25deg', '45deg'],
                  extrapolate: 'clamp'
                })
              }
            ]
          }]} 
          resizeMode="contain"
        />

        {isGameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>{t('easterEgg.gameOver', '¡Ups!')}</Text>
            
            {newRecordType === 'global' && (
              <View style={[styles.congratsBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.congratsText}>{t('easterEgg.newGlobalRecord', '👑 ¡NUEVO RÉCORD GLOBAL! 👑')}</Text>
              </View>
            )}
            
            {newRecordType === 'personal' && (
              <View style={[styles.congratsBadge, { backgroundColor: '#F6BE2F' }]}>
                <Text style={[styles.congratsText, { color: '#0B1956' }]}>{t('easterEgg.newPersonalRecord', '🌟 ¡RÉCORD PERSONAL! 🌟')}</Text>
              </View>
            )}

            <View style={styles.scoreBoard}>
              <Text style={styles.finalScoreText}>{t('easterEgg.score', 'Puntaje')}: {score}</Text>
              <Text style={styles.recordText}>{t('easterEgg.personalRecord', 'Récord Personal')}: {highScore}</Text>
              {globalRecord > 0 ? (
                <Text style={styles.recordTextGlobal}>
                  {t('easterEgg.weeklyGlobalRecord', 'Récord Global Semanal')}: {globalRecord} ({globalRecordHolder})
                </Text>
              ) : (
                <Text style={styles.recordTextGlobal}>
                  {t('easterEgg.weeklyGlobalRecord', 'Récord Global Semanal')}: {t('easterEgg.noRecordYet', 'Sin récord aún')}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.retryButton} onPress={resetGame}>
              <Text style={styles.retryButtonText}>{t('easterEgg.playAgain', 'Jugar de nuevo')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#050515',
    ...(Platform.OS === 'web' && {
      width: '100vw',
      height: '100vh',
    }),
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web' && {
      width: '100vw',
      height: '100vh',
    }),
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      width: '100vw',
      height: '100vh',
      objectFit: 'cover',
    }),
  },
  bird: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  pipe: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: '#38bdf8',
    borderWidth: 2.5,
    borderRadius: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pipeTop: {
    top: 0,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  pipeBottom: {
    bottom: 0,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  pipeEnergyLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    marginLeft: -1,
    width: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
  },
  pipeCap: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: '#38bdf8',
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  pipeCapBottomEdge: {
    bottom: 0,
  },
  pipeCapTopEdge: {
    top: 0,
  },
  scoreText: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 80 : 130,
    alignSelf: 'center',
    fontSize: 56,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'black',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    zIndex: 10,
  },
  startOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  startText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gameOverText: {
    fontSize: 50,
    fontWeight: '900',
    color: 'white',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  congratsBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  congratsText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  scoreBoard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  finalScoreText: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recordText: {
    fontSize: 18,
    color: '#F6BE2F',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recordTextGlobal: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#F6BE2F',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#0B1956',
    fontWeight: 'bold',
    fontSize: 18,
  }
});
