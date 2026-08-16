import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Colors, Radii, Shadows } from '../theme';
import { wsService } from '../services/WebSocketService';

export const MediaScreen: React.FC = () => {
  const [activeSubtab, setActiveSubtab] = useState<'yt' | 'spotify'>('yt');
  const [ytSearch, setYtSearch] = useState('');

  const sendYt = (cmd: string, q: string = '') => {
    wsService.triggerHaptic();
    wsService.send({ t: 'yt_cmd', cmd, q });
  };

  const sendSpotify = (cmd: string) => {
    wsService.triggerHaptic();
    wsService.send({ t: 'spotify_cmd', cmd });
  };

  const handleYtSearch = () => {
    if (ytSearch.trim()) {
      sendYt('search', ytSearch.trim());
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Subtabs Switcher */}
      <View style={styles.subtabsContainer}>
        <TouchableOpacity
          style={[styles.subtab, activeSubtab === 'yt' && styles.subtabActive]}
          onPress={() => setActiveSubtab('yt')}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, activeSubtab === 'yt' && styles.subtabTextActive]}>
            YOUTUBE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subtab, activeSubtab === 'spotify' && styles.subtabActive]}
          onPress={() => setActiveSubtab('spotify')}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, activeSubtab === 'spotify' && styles.subtabTextActive]}>
            SPOTIFY
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* A. YOUTUBE PANEL                                          */}
      {/* ========================================================= */}
      {activeSubtab === 'yt' && (
        <View style={styles.panel}>
          <TouchableOpacity
            style={styles.launcherBanner}
            onPress={() => sendYt('launch')}
            activeOpacity={0.8}
          >
            <Text style={styles.launcherTitle}>OPEN YOUTUBE IN BROWSER</Text>
            <Text style={styles.launcherArrow}>-></Text>
          </TouchableOpacity>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              value={ytSearch}
              onChangeText={setYtSearch}
              placeholder="SEARCH YOUTUBE VIDEO..."
              placeholderTextColor={Colors.inkTertiary}
              returnKeyType="search"
              onSubmitEditing={handleYtSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleYtSearch} activeOpacity={0.7}>
              <Text style={styles.searchBtnText}>SEARCH</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity style={styles.ctrlBtnSec} onPress={() => sendYt('prev')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnSecText}>PREV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtnMain} onPress={() => sendYt('play_pause')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnMainText}>PLAY / PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtnSec} onPress={() => sendYt('next')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnSecText}>NEXT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.seekRow}>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendYt('seek_back_10')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>-10S</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendYt('seek_back_5')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>-5S</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendYt('seek_fwd_5')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>+5S</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendYt('seek_fwd_10')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>+10S</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>SPEED</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('speed_down')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>SLOWER (&lt;)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('speed_up')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>FASTER (&gt;)</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>DISPLAY & AUDIO</Text>
            <View style={styles.grid2}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('fullscreen')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>FULLSCREEN (F)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('theater')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>THEATER (T)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('miniplayer')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>MINI (I)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('cc')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>CAPTIONS (C)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('volume_up')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>VOL +</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('volume_down')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>VOL -</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendYt('mute')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>MUTE (M)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ========================================================= */}
      {/* B. SPOTIFY PANEL                                          */}
      {/* ========================================================= */}
      {activeSubtab === 'spotify' && (
        <View style={styles.panel}>
          <TouchableOpacity
            style={styles.launcherBanner}
            onPress={() => sendSpotify('open')}
            activeOpacity={0.8}
          >
            <Text style={styles.launcherTitle}>LAUNCH SPOTIFY APP</Text>
            <Text style={styles.launcherArrow}>-></Text>
          </TouchableOpacity>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity style={styles.ctrlBtnSec} onPress={() => sendSpotify('prev')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnSecText}>PREV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtnMain} onPress={() => sendSpotify('play_pause')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnMainText}>PLAY / PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtnSec} onPress={() => sendSpotify('next')} activeOpacity={0.7}>
                <Text style={styles.ctrlBtnSecText}>NEXT</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.seekRow}>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendSpotify('seek_back')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>-5S</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.seekBtn} onPress={() => sendSpotify('seek_fwd')} activeOpacity={0.7}>
                <Text style={styles.seekBtnText}>+5S</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>PLAYBACK MODE</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('shuffle')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>SHUFFLE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('repeat')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>REPEAT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('like')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>LIKE SONG</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>VOLUME</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('volume_up')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>VOL +</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('volume_down')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>VOL -</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => sendSpotify('mute')} activeOpacity={0.7}>
                <Text style={styles.gridBtnText}>MUTE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgVoid,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 68,
    gap: 8,
  },
  subtabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSurface,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    padding: 2,
    gap: 3,
  },
  subtab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtabActive: {
    backgroundColor: Colors.inkPrimary,
  },
  subtabText: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '900',
    color: Colors.inkSecondary,
  },
  subtabTextActive: {
    color: Colors.inkInverse,
  },
  panel: {
    gap: 8,
  },
  launcherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inkPrimary,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  launcherTitle: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '900',
    color: Colors.inkInverse,
    letterSpacing: 0.5,
  },
  launcherArrow: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '900',
    color: Colors.inkInverse,
  },
  searchBox: {
    flexDirection: 'row',
    gap: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: 'Courier',
    color: Colors.inkPrimary,
  },
  searchBtn: {
    backgroundColor: Colors.inkPrimary,
    borderRadius: Radii.xs,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkInverse,
  },
  heroCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    padding: 10,
    gap: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  ctrlBtnSec: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: Radii.xs,
    paddingVertical: 9,
    alignItems: 'center',
  },
  ctrlBtnSecText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  ctrlBtnMain: {
    flex: 1.8,
    backgroundColor: Colors.inkPrimary,
    borderRadius: Radii.xs,
    paddingVertical: 9,
    alignItems: 'center',
  },
  ctrlBtnMainText: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '900',
    color: Colors.inkInverse,
  },
  seekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  seekBtn: {
    flex: 1,
    backgroundColor: Colors.bgSubtle,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    borderRadius: Radii.xs,
    paddingVertical: 7,
    alignItems: 'center',
  },
  seekBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    borderRadius: Radii.xs,
    padding: 8,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '900',
    color: Colors.inkTertiary,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridBtn: {
    flex: 1,
    minWidth: '31%',
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    borderRadius: Radii.xs,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBtnText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
});
