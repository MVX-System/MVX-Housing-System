const announcements = {
  common: {
    important: "Important",
    information: "Information",
    normal: "Normal",
    loading: "Loading...",
    refresh: "Refresh",
    saving: "Saving...",
    working: "Working...",
  },

  resident: {
    title: "Announcements",
    subtitle: "Current information from {{facilityName}}.",
    noCurrent: "There are no current announcements.",
    showLess: "Show less",
    readPreview: "Read preview",
    openAnnouncement: "Open announcement →",
  },

  details: {
    back: "← Back to announcements",
    loading: "Loading announcement...",
    missingIdentifier: "Announcement identifier is missing.",
    notFound: "Announcement not found.",
    loadFailed: "Announcement could not be loaded.",
  },

  admin: {
    title: "Announcement Management",
    subtitle: "Create and publish notices for residents.",
    editAnnouncement: "Edit Announcement",
    newAnnouncement: "New Announcement",
    formHint: "Save as a draft or publish immediately.",
    cancelEditing: "Cancel editing",
    saveChanges: "Save changes",
    saveDraft: "Save draft",
    saveAndPublish: "Save and publish",
    listTitle: "Announcements",
    summary: "{{active}} active or draft, {{total}} total",
    loadingAnnouncements: "Loading announcements...",
    noAnnouncements: "No announcements created.",
    updated: "Updated",
    from: "From",
    until: "Until",
    edit: "Edit",
    publish: "Publish",
    archive: "Archive",


    recipients: {
      title: "Recipients",
      hint: "Combine sections, apartments, roles and individual users. Everyone overrides other recipients.",
      everyone: "Everyone",
      section: "Section",
      apartment: "Apartment",
      role: "Role",
      user: "User",
      sections: "Sections",
      apartments: "Apartments",
      roles: "Roles",
      users: "Users",
      loading: "Loading recipients...",
      select: "Select a recipient",
      add: "Add",
      setEveryone: "Send to everyone",
      remove: "Remove recipient",
    },

    fields: {
      title: "Title",
      text: "Text",
      priority: "Priority",
      visibleFrom: "Visible from",
      visibleUntil: "Visible until",
    },

    placeholders: {
      title: "Announcement title",
      text: "Information for residents",
    },

    status: {
      published: "Published",
      archived: "Archived",
      draft: "Draft",
    },

    validation: {
      title: "Enter a title.",
      content: "Enter announcement text.",
      recipients: "Select at least one recipient.",
      dateOrder: "The end date cannot be earlier than the start date.",
      saveFailed: "The announcement could not be saved. Check the message above.",
    },

    notice: {
      published: "Announcement published.",
      updated: "Announcement updated.",
      draftSaved: "Draft saved.",
      archived: "Announcement archived.",
    },

    confirm: {
      publish: "Publish \"{{title}}\"?",
      archive: "Archive \"{{title}}\"? Residents will no longer see it.",
    },
  },
};

export default announcements;
