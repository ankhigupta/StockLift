import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as SecureStore from "expo-secure-store";


import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AuctionListScreen from "../screens/AuctionListScreen";
import AuctionDetailScreen from "../screens/AuctionDetailScreen";
import BidScreen from "../screens/BidScreen";
import PaymentScreen from "../screens/PaymentScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Auctions" component={AuctionListScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}}/>
        <Stack.Screen name="Register" component={RegisterScreen} options={{headerShown: false}}/>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="AuctionDetail" component={AuctionDetailScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Bid" component={BidScreen} options={{ headerShown: false }}/>
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}