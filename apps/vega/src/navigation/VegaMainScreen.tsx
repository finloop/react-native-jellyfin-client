import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMenuContext, colors } from '@multi-tv/shared-ui';
import VegaTopBar from '../components/VegaTopBar';
import VegaHomeScreen from '../screens/VegaHomeScreen';
import VegaLibrariesScreen from '../screens/VegaLibrariesScreen';
import VegaSearchScreen from '../screens/VegaSearchScreen';
import VegaPlaceholderScreen from '../screens/VegaPlaceholderScreen';
import type { TopTab } from './types';

/**
 * The `Main` route. Replaces the old drawer navigator: a persistent top bar over a
 * single active content view, switched by local `activeTab` state. `MenuContext.isOpen`
 * arbitrates focus ownership between the bar and the content (exactly one is active).
 */
export default function VegaMainScreen() {
  const [activeTab, setActiveTab] = useState<TopTab>('Home');
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();

  const handleSelectTab = useCallback(
    (tab: TopTab) => {
      setActiveTab(tab);
      toggleMenu(false); // switch the view and drop focus into it
    },
    [toggleMenu],
  );

  const handleEnterContent = useCallback(() => {
    toggleMenu(false);
  }, [toggleMenu]);

  return (
    <View style={styles.container}>
      <VegaTopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onEnterContent={handleEnterContent}
        isVisible={isMenuOpen}
      />
      <View style={styles.content}>
        {activeTab === 'Home' && <VegaHomeScreen />}
        {activeTab === 'Search' && <VegaSearchScreen />}
        {activeTab === 'Libraries' && <VegaLibrariesScreen />}
        {activeTab === 'Favourites' && <VegaPlaceholderScreen title="Favourites" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
