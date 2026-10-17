import { Linking, Platform } from 'react-native';

// Opens a URL that is only known after an async request (e.g. an assessment session).
// On web the tab is opened synchronously inside the click, because browsers block
// window.open calls made after a slow await; it is pointed at the URL once it arrives
// and closed again if the request fails.
export async function launchInNewTab(getUrl) {
  const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
  const tab = isWeb ? window.open('', '_blank') : null;
  try {
    const url = await getUrl();
    if (!url) {
      if (tab) tab.close();
      return null;
    }
    if (tab) tab.location.href = url;
    else if (isWeb) window.open(url, '_blank');
    else await Linking.openURL(url);
    return url;
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}
