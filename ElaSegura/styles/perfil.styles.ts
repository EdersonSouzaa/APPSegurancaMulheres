import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7D2F1', // O mesmo fundo da Home
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 50 : 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 14,
    color: '#6A6A75',
    marginBottom: 20,
  },
  formCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 13,
    color: '#1A1A1A',
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 14,
    color: '#1A1A1A',
  },
  saveButton: {
    backgroundColor: '#F35F74',
    borderRadius: 20,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#F35F74',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});