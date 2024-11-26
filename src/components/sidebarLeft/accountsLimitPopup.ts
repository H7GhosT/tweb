import PopupElement from '../popups';
import AccountsLimitPopupContent from './accountsLimitPopupContent';

export default class AccountsLimitPopup extends PopupElement {
  constructor() {
    super('accounts-limit-popup', {
      overlayClosable: true,
      body: true,
      title: 'LimitReached'
      // buttons: [{}]
    });

    this.body.append(AccountsLimitPopupContent({
      onCancel: () => {
        this.hide();
      },
      onSubmit: () => {
        this.hide();
      }
    }) as HTMLElement)
  }
}
