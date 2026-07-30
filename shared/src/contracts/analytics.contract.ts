// Analytics requests don't include the userId, the server has access from the verified JWT.

export type RecordedAnalyticsEvent = {
    id: number;
    user_id: number;
    created_at: string;
} & AnalyticsEvent;

export type AnalyticsEvent =
    | RegisterEvent
    | LoginEvent
    | LogoutEvent
    | PageViewEvent
    | DrawerOpenedEvent
    | DrawerClosedEvent
    | ModalOpenedEvent
    | ModalClosedEvent
    | FormSubmittedEvent
    | SearchPerformedEvent
    | NextPageEvent
    | PreviousPageEvent
    | PageSizeEvent
    | TableRowCreatedEvent
    | TableRowUpdatedEvent
    | TableRowDeletedEvent;

export type RegisterEvent = {
    name: "register";
    properties: {
        username: string;
    };
};

export type LoginEvent = {
    name: "login";
};

export type LogoutEvent = {
    name: "logout";
};

export type PageViewEvent = {
    name: "page_viewed";
    properties: {
        path: string;
    };
};

export type DrawerOpenedEvent = {
    name: "drawer_opened";
    properties: {
        drawer: string;
        path: string;
    };
};

export type DrawerClosedEvent = {
    name: "drawer_closed";
    properties: {
        drawer: string;
        path: string;
    };
};

export type ModalOpenedEvent = {
    name: "modal_opened";
    properties: {
        modal: string;
        path: string;
    };
};

export type ModalClosedEvent = {
    name: "modal_closed";
    properties: {
        modal: string;
        path: string;
    };
};

export type FormSubmittedEvent = {
    name: "form_submitted";
    properties: {
        form: string;
        path: string;
    };
};

export type SearchPerformedEvent = {
    name: "search_performed";
    properties: {
        feature: SearchFeature;
        path: string;
    };
};

export type SearchFeature = "book_search" | "food_entry_search";

export type NextPageEvent = {
    name: "pagination_next_page";
    properties: {
        feature: string;
        page: number;
        path: string;
    };
};

export type PreviousPageEvent = {
    name: "pagination_previous_page";
    properties: {
        feature: string;
        page: number;
        path: string;
    };
};

export type PageSizeEvent = {
    name: "pagination_set_page_size";
    properties: {
        feature: string;
        pageSize: number;
        path: string;
    };
};

export type TableRowCreatedEvent = {
    name: "table_row_created";
    properties: {
        table: string;
        path: string;
    };
};

export type TableRowUpdatedEvent = {
    name: "table_row_updated";
    properties: {
        table: string;
        path: string;
    };
};

export type TableRowDeletedEvent = {
    name: "table_row_deleted";
    properties: {
        table: string;
        path: string;
    };
};
