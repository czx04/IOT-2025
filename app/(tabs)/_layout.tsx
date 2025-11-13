import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <NativeTabs
      labelStyle={{
        color: Platform.select({
          ios: DynamicColorIOS({
            dark: 'white',
            light: 'black',
          }),
          default: undefined,
        }),
      }}
      tintColor={Platform.select({
        ios: DynamicColorIOS({
          dark: 'white',
          light: 'black',
        }),
        default: undefined,
      })}>
      <NativeTabs.Trigger name="home">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="ic_home" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} drawable="ic_chart" />
        <Label>Track</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon
          sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
          drawable="ic_person"
        />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
