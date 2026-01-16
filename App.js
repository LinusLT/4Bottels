import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_GOAL_ML = 2000;
const STORAGE_KEY = 'water-tracker-state-v1';

const getDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseIntSafe = value => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const buildInitialState = () => ({
    remainingMl: DAILY_GOAL_ML,
    streak: 0,
    lastDate: getDateKey(),
    completedToday: false,
});

const hydrateStateForToday = state => {
    const today = getDateKey();

    if (state.lastDate === today) {
        return state;
    }

    const streak = state.completedToday ? state.streak + 1 : 0;

    return {
        remainingMl: DAILY_GOAL_ML,
        streak,
        lastDate: today,
        completedToday: false,
    };
};

export default function App() {
    const [remainingMl, setRemainingMl] = useState(DAILY_GOAL_ML);
    const [streak, setStreak] = useState(0);
    const [lastDate, setLastDate] = useState(getDateKey());
    const [completedToday, setCompletedToday] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const persistState = useCallback(
        async nextState => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
            } catch (error) {
                // Silent fail to avoid crashing the UI on storage errors.
            }
        },
        [],
    );

    const setStateFromStorage = useCallback(
        hydrated => {
            setRemainingMl(hydrated.remainingMl);
            setStreak(hydrated.streak);
            setLastDate(hydrated.lastDate);
            setCompletedToday(hydrated.completedToday);
            persistState(hydrated);
        },
        [persistState],
    );

    useEffect(() => {
        const loadState = async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                const parsed = stored ? JSON.parse(stored) : buildInitialState();
                const hydrated = hydrateStateForToday(parsed);
                setStateFromStorage(hydrated);
            } catch (error) {
                const fallback = buildInitialState();
                setStateFromStorage(fallback);
            }
        };

        loadState();
    }, [setStateFromStorage]);

    useEffect(() => {
        persistState({
            remainingMl,
            streak,
            lastDate,
            completedToday,
        });
    }, [completedToday, lastDate, persistState, remainingMl, streak]);

    const handleAddWater = useCallback(() => {
        const amount = parseIntSafe(inputValue);

        if (amount <= 0) {
            return;
        }

        const nextRemaining = clamp(remainingMl - amount, 0, DAILY_GOAL_ML);
        const didComplete = nextRemaining === 0;

        setRemainingMl(nextRemaining);
        setCompletedToday(didComplete || completedToday);
        setInputValue('');
    }, [completedToday, inputValue, remainingMl]);

    const progress = useMemo(() => {
        const consumed = DAILY_GOAL_ML - remainingMl;
        return clamp(consumed / DAILY_GOAL_ML, 0, 1);
    }, [remainingMl]);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.streakText}>
                Dage i streg fuld flaske: {streak}
            </Text>

            <View style={styles.bottleContainer}>
                <View style={styles.bottleOutline}>
                    <View style={[styles.bottleFill, {height: `${progress * 100}%`}]} />
                </View>
                <Text style={styles.remainingText}>{remainingMl} ml tilbage</Text>
            </View>

            <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Indtast væske (ml)</Text>
                <TextInput
                    value={inputValue}
                    onChangeText={setInputValue}
                    placeholder="Fx 250"
                    keyboardType="number-pad"
                    style={styles.input}
                    returnKeyType="done"
                    onSubmitEditing={handleAddWater}
                />
                <TouchableOpacity style={styles.button} onPress={handleAddWater}>
                    <Text style={styles.buttonText}>Tilføj</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6FBFF',
        alignItems: 'center',
        padding: 24,
    },
    streakText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#11314E',
        marginBottom: 24,
    },
    bottleContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    bottleOutline: {
        width: 140,
        height: 280,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: '#4AA3DF',
        backgroundColor: '#E6F3FF',
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    bottleFill: {
        backgroundColor: '#4AA3DF',
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    remainingText: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: '700',
        color: '#11314E',
    },
    inputCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#1A365D',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: {width: 0, height: 6},
        elevation: 3,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#11314E',
    },
    input: {
        borderWidth: 1,
        borderColor: '#CFE0F3',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 16,
        color: '#11314E',
    },
    button: {
        backgroundColor: '#1F6FEB',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
