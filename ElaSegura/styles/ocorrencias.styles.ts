import { StyleSheet, Platform } from 'react-native';

export const getStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 70 : 80,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  occurrenceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 25,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  occurrenceIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDarkMode ? colors.accent : '#FFF0F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  occurrenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  occurrenceDescription: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  occurrenceTime: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 6,
  },
  addButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    borderRadius: 25,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  activeTabText: {
    color: '#FFF',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterChip: {
    backgroundColor: isDarkMode ? '#331A1D' : '#FDEEF1',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.secondary,
  },
  activeFilterChipText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  distanceBadge: {
    backgroundColor: isDarkMode ? colors.accent : '#FFF0F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    marginTop: 10,
  },
});