import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7D2F1', // O mesmo fundo rosa da Home
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6A6A75',
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#F35F74',
    marginHorizontal: 20,
    borderRadius: 20,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50, // Dá um respiro para não ficar colado no fundo
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6A6A75',
    textAlign: 'center',
    marginTop: 10,
  },
});