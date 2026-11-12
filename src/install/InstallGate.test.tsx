import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { InstallGate } from './InstallGate';
import { fakeInstallStatus, type InstallStatus } from './installStatus';

function renderApp(installStatus: InstallStatus) {
  return render(
    <InstallGate installStatus={installStatus}>
      <p>The app</p>
    </InstallGate>,
  );
}

const installScreen = () => screen.queryByRole('heading', { name: /add .* to your home screen/i });
const reminder = () => screen.queryByRole('note', { name: /install reminder/i });

describe('InstallGate', () => {
  afterEach(cleanup);

  it('on a first visit in a browser tab, explains how and why to add the app to the Home Screen', () => {
    renderApp(fakeInstallStatus({ installed: false }));

    expect(installScreen()).not.toBeNull();
    expect(screen.getByText(/share/i)).not.toBeNull();
    expect(screen.getByText(/add to home screen/i)).not.toBeNull();
    expect(screen.getByText(/so your progress doesn.t vanish/i)).not.toBeNull();
    expect(screen.queryByText('The app')).toBeNull();
  });

  it('lets the Learner continue in the tab, then shows the app with a reminder', () => {
    renderApp(fakeInstallStatus({ installed: false }));

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(installScreen()).toBeNull();
    expect(screen.getByText('The app')).not.toBeNull();
    expect(reminder()).not.toBeNull();
  });

  it('shows the install screen only once', () => {
    const installStatus = fakeInstallStatus({ installed: false });
    renderApp(installStatus);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    cleanup();

    renderApp(installStatus);

    expect(installScreen()).toBeNull();
    expect(screen.getByText('The app')).not.toBeNull();
    expect(reminder()).not.toBeNull();
  });

  it('shows nothing about installing when running as an installed app', () => {
    renderApp(fakeInstallStatus({ installed: true }));

    expect(installScreen()).toBeNull();
    expect(reminder()).toBeNull();
    expect(screen.getByText('The app')).not.toBeNull();
  });
});
