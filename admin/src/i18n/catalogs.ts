import { aiEditMessagesEn, aiEditMessagesIt } from './ai-edit-messages';
import { videoMessagesEn, videoMessagesIt } from './video-messages';

export type UiLocale =
  | 'it_IT'
  | 'en_US'
  | 'fr_FR'
  | 'de_DE'
  | 'es_ES'
  | 'pt_PT'
  | 'pt_BR'
  | 'pl_PL'
  | 'ru_RU'
  | 'da_DK'
  | 'nl_NL';

export type MessageKey =
  | 'videoOptimizer'
  | 'videoOptimizerDesc'
  | 'videoOutputFormat'
  | 'videoOptimization'
  | 'videoKeepAspect'
  | 'videoConvert'
  | 'videoConvertDesc'
  | 'videoOptimize'
  | 'videoOptimizeDesc'
  | 'videoResizeDesc'
  | 'videoPoster'
  | 'videoPosterDesc'
  | 'videoPosterSecond'
  | 'videoPosterSeconds'
  | 'videoPosterTenths'
  | 'videoPosterDuration'
  | 'videoPosterGenerate'
  | 'videoPosterCompleted'
  | 'videoPosterConfirmBody'
  | 'videoProcessingConfirmTitle'
  | 'videoProcessingConfirmBody'
  | 'videoRestoreConfirmBody'
  | 'videoFfmpegMissing'
  | 'videoPreparing'
  | 'videoBackgroundHint'
  | 'videoCompleted'
  | 'videoFailed'
  | 'videoSavings'
  | 'videoNoSavings'
  | 'videoRestoreQueued'
  | 'providerModelSearch'
  | 'providerModelCustom'

  | 'providerModelsHint'
  | 'providerModelsRefresh'
  | 'providerModelsFallback'
  | 'providerModelsLive'

  | 'bulkAiChooseFields'
  | 'bulkAiFilename'
  | 'bulkFolderConfirmTitle'
  | 'bulkFolderConfirmBody'

  | 'generateAllConfirmBody'
  | 'generateAllRenameFilename'
  | 'generateAllRenameUnavailable'
  | 'translateOtherLanguagesBody'
  | 'translateOtherLanguagesOption'

  | 'orderBy'
  | 'orderDefault'
  | 'orderNewest'
  | 'orderOldest'
  | 'orderTitleAsc'
  | 'orderTitleDesc'
  | 'orderLargest'
  | 'orderSmallest'
  | 'orderMostUsed'
  | 'orderLeastUsed'
  | 'scanQueuedBackground'
  | 'scanBackgroundProgress'
  | 'scanComparingProgress'
  | 'scanComparingTitle'
  | 'scanBackgroundHint'
  | 'scanProgressCount'
  | 'scanFailedBackground'
  | 'scanInterruptedTitle'
  | 'scanInterruptedBody'
  | 'resumeScan'
  | 'scanCompleteBackground'
  | 'unusedScanNeeded'
  | 'unusedSafetyWarning'
  | 'groupPreviewLimited'
  | 'unusedPagination'

  | 'title'
  | 'library'
  | 'duplicates'
  | 'health'
  | 'system'
  | 'settings'
  | 'features'
  | 'search'
  | 'newFolder'
  | 'newSubfolder'
  | 'newSubfolderTitle'
  | 'downloadZip'
  | 'downloadZipBusy'
  | 'downloadZipEmpty'
  | 'downloadZipTooMany'
  | 'downloadZipFailed'
  | 'folderColor'
  | 'folderColorRemove'
  | 'moveFolder'
  | 'moveFolderTo'
  | 'moveFolderRoot'
  | 'reorderBefore'
  | 'reorderAfter'
  | 'reorderStart'
  | 'reorderEnd'
  | 'reorderMoved'
  | 'smartViews'
  | 'smartViewAll'
  | 'smartViewUnused'
  | 'smartViewMissingAlt'
  | 'smartViewLargeFiles'
  | 'smartViewUnanalyzed'
  | 'foldersNav'
  | 'smartViewSave'
  | 'smartViewSaveCurrent'
  | 'smartViewSaveNeedFilters'
  | 'smartViewSaveTitle'
  | 'smartViewName'
  | 'smartViewNamePlaceholder'
  | 'smartViewRename'
  | 'smartViewUpdateFilters'
  | 'smartViewUpdateTitle'
  | 'smartViewUpdateBody'
  | 'smartViewDelete'
  | 'smartViewDeleteBody'
  | 'smartViewsEmpty'
  | 'toastSmartViewCreated'
  | 'toastSmartViewCreateFailed'
  | 'toastSmartViewRenamed'
  | 'toastSmartViewRenameFailed'
  | 'toastSmartViewUpdated'
  | 'toastSmartViewUpdateFailed'
  | 'toastSmartViewDeleted'
  | 'toastSmartViewDeleteFailed'
  | 'upload'
  | 'uploading'
  | 'analyze'
  | 'generateWithAi'
  | 'generateAllData'
  | 'empty'
  | 'loading'
  | 'error'
  | 'main'
  | 'refresh'
  | 'refreshed'
  | 'resyncQueued'
  | 'pageLibraryTitle'
  | 'pageLibrarySubtitle'
  | 'pageDuplicatesTitle'
  | 'pageDuplicatesSubtitle'
  | 'pageHealthTitle'
  | 'pageHealthSubtitle'
  | 'pageSystemTitle'
  | 'pageSystemSubtitle'
  | 'pageSettingsTitle'
  | 'pageSettingsSubtitle'
  | 'pageFeaturesTitle'
  | 'pageFeaturesSubtitle'
  | 'languagesTitle'
  | 'languagesDescription'
  | 'toolLanguage'
  | 'toolLanguageHint'
  | 'defaultLanguage'
  | 'defaultLanguageHint'
  | 'enabledLanguages'
  | 'enabledLanguagesHint'
  | 'defaultLocked'
  | 'settingsSaved'
  | 'followWordPress'
  | 'theme'
  | 'themeLight'
  | 'themeDark'
  | 'themeSystem'
  | 'themeHint'
  | 'mediaTabLabel'
  | 'mediaTabLabelHint'
  | 'systemPass'
  | 'systemWarn'
  | 'systemFail'
  | 'systemInfo'
  | 'systemAllGood'
  | 'systemNeedsAttention'
  | 'systemSummary'
  | 'systemCheck'
  | 'systemValue'
  | 'systemIdeal'
  | 'systemStatus'
  | 'systemGroupOk'
  | 'systemGroupWarn'
  | 'systemGroupFail'
  | 'systemRequiredNote'
  // Toasts
  | 'toastChangesSaved'
  | 'toastChangesSaveFailed'
  | 'toastOptimized'
  | 'toastOptimizeSkipped'
  | 'toastOptimizeFailed'
  | 'toastRestored'
  | 'toastRestoreFailed'
  | 'toastOriginalDeleted'
  | 'toastOriginalDeleteFailed'
  | 'toastReplaced'
  | 'toastReplaceFailed'
  | 'toastRenamed'
  | 'toastRenameFailed'
  | 'toastRenameAiSuggested'
  | 'toastRenameAiFailed'
  | 'toastAiAllSaved'
  | 'toastAiFieldSaved'
  | 'toastAiFailed'
  | 'toastAiNoApiKey'
  | 'toastAiCancelled'
  | 'toastAiQueued'
  | 'cancelAiGeneration'
  | 'inspectorPrev'
  | 'inspectorNext'
  | 'inspectorClose'
  | 'toastUsageUpdated'
  | 'toastUsageFailed'
  | 'toastTrashed'
  | 'toastTrashFailed'
  | 'toastUrlCopied'
  | 'toastUrlCopyFailed'
  | 'inspectorCopyUrl'
  | 'inspectorDownload'
  | 'toastImageEdited'
  | 'toastImageEditFailed'
  | 'toastResized'
  | 'toastResizeFailed'
  | 'toastConverted'
  | 'toastConvertedReferences'
  | 'toastConvertFailed'
  | 'toastBulkConvertMissing'
  | 'toastBulkConvertPartial'
  | 'toastRemoveBgApplied'
  | 'toastRemoveBgFailed'
  | 'toastFolderCreated'
  | 'toastFolderCreateFailed'
  | 'toastFolderRenamed'
  | 'toastFolderRenameFailed'
  | 'toastFolderMoved'
  | 'toastFolderMoveFailed'
  | 'toastFolderDeleted'
  | 'toastFolderDeletedWithMedia'
  | 'toastFolderDeleteFailed'
  | 'toastAddedToFolder'
  | 'toastAddedToFolderMany'
  | 'toastFolderAssignFailed'
  | 'toastRemovedFromFolder'
  | 'toastFolderUnassignFailed'
  | 'toastFeaturesSaved'
  | 'toastFeaturesSaveFailed'
  | 'toastUploadOk'
  | 'toastUploadPartial'
  | 'toastUploadFailed'
  | 'toastUploading'
  | 'toastIndexQueued'
  | 'toastUsageRebuildDone'
  | 'toastDuplicatesScanned'
  | 'toastUnusedRescanQueued'
  | 'toastUnusedRescanStarted'
  | 'toastBulkAnalyzeQueued'
  | 'toastBulkUsageScanned'
  | 'toastBulkUsageQueued'
  | 'toastBulkTrashed'
  | 'toastBulkTrashPartial'
  | 'bulkAltAction'
  | 'bulkAltConfirmTitle'
  | 'bulkAltConfirmBody'
  | 'bulkAltConfirmNote'
  | 'bulkAltConfirmAction'
  | 'bulkAltGeneratingTitle'
  | 'bulkAltGenerating'
  | 'bulkAltProgressCount'
  | 'bulkAltRetry'
  | 'bulkAltColFile'
  | 'bulkAltColResult'
  | 'bulkAltColAlt'
  | 'bulkAltEmpty'
  | 'bulkAltFailed'
  | 'bulkAltTooMany'
  | 'bulkAltRecapTitle'
  | 'bulkAltRecapSummary'
  | 'bulkAltRecapDone'
  | 'bulkAltRecapSkipped'
  | 'bulkAltStatusApplied'
  | 'bulkAltStatusFailed'
  | 'bulkAltStatusSkipped'
  | 'toastBulkAltApplied'
  | 'toastBulkAltPreviewFailed'
  | 'toastBulkAltApplyFailed'
  | 'toastCommandFailed'
  | 'toastSettingsSaved'
  | 'toastGenericError'
  | 'tabAppearance'
  | 'tabConfiguration'
  | 'configurationDesc'
  | 'folderPaletteTitle'
  | 'folderPaletteHint'
  | 'paletteColor'
  | 'removePaletteColor'
  | 'addPaletteColor'
  | 'tabLanguages'
  | 'tabAi'
  | 'tabPrivacy'
  | 'tabMaintenance'
  | 'tabImport'
  | 'importFoldersLead'
  | 'importHappyFilesMissing'
  | 'importHappyFilesSummary'
  | 'importHappyFilesAction'
  | 'importHappyFilesWorking'
  | 'importHappyFilesDone'
  | 'importHappyFilesDisabled'
  | 'importRealMediaMissing'
  | 'importRealMediaAction'
  | 'importRealMediaDone'
  | 'importFileBirdMissing'
  | 'importFileBirdAction'
  | 'importFileBirdDone'
  | 'importWpMediaFolderMissing'
  | 'importWpMediaFolderAction'
  | 'importWpMediaFolderDone'
  | 'privacyTitle'
  | 'privacyDescription'
  | 'privacyStripExif'
  | 'privacyStripExifDesc'
  | 'privacySendReduced'
  | 'privacySendReducedDesc'
  | 'privacyNeverOriginals'
  | 'privacyNeverOriginalsDesc'
  | 'uninstallDataLabel'
  | 'uninstallKeep'
  | 'uninstallDelete'
  | 'uninstallHint'
  | 'relaunchWizard'
  | 'relaunchWizardHint'
  | 'relaunchWizardConfirmTitle'
  | 'relaunchWizardConfirmBody'
  | 'tabLicense'
  | 'licenseTitle'
  | 'licenseDescription'
  | 'licenseLockedDescription'
  | 'licenseKey'
  | 'licenseKeyHint'
  | 'licenseActivate'
  | 'licenseDeactivate'
  | 'licenseActivating'
  | 'licenseStatusActive'
  | 'licenseStatusInactive'
  | 'licenseStatusInvalid'
  | 'licenseWhereCode'
  | 'licenseBuyCta'
  | 'licenseDomain'
  | 'licensePlan'
  | 'licenseExpires'
  | 'licenseSites'
  | 'licenseBannerTitle'
  | 'licenseGateBody'
  | 'licenseBannerCta'
  | 'licenseUnlockPro'
  | 'freeBannerTitle'
  | 'freeBannerBody'
  | 'freeBannerDismiss'
  | 'proUpgradeTitle'
  | 'proUpgradeBody'
  | 'freeEditionTag'
  | 'proFeatureLocked'
  | 'featuresFreeNote'
  | 'featuresLoading'
  | 'featuresLoadFailed'
  | 'featuresIntro'
  | 'featuresAiNote'
  | 'featuresProNote'
  | 'featuresColFeature'
  | 'featuresColType'
  | 'featuresColStatus'
  | 'catLibrary'
  | 'catSearch'
  | 'catAi'
  | 'catInsights'
  | 'catTools'
  | 'catIntegrations'
  | 'catSystem'
  | 'save'
  | 'saving'
  | 'cancel'
  | 'overviewIntroTitle'
  | 'overviewIntroBody'
  | 'overviewFoldersTitle'
  | 'overviewFoldersBody'
  | 'overviewFiltersTitle'
  | 'overviewFiltersBody'
  | 'overviewUploadTitle'
  | 'overviewUploadBody'
  | 'overviewGridTitle'
  | 'overviewGridBody'
  | 'overviewMediaTitle'
  | 'overviewMediaBody'
  | 'overviewSettingsTitle'
  | 'overviewSettingsBody'
  | 'overviewBack'
  | 'overviewNext'
  | 'overviewSkip'
  | 'overviewDone'
  | 'overviewProgress'
  | 'allMedia'
  | 'noFoldersYet'
  | 'folderName'
  | 'folderNamePlaceholder'
  | 'createFolder'
  | 'folderNameRequired'
  | 'deleting'
  | 'deleteFolder'
  | 'deleteFolderTitle'
  | 'deleteUnlinkCount'
  | 'folderEmpty'
  | 'folderUnlinkBody'
  | 'folderFilesStay'
  | 'folderChildrenMove'
  | 'chooseFolder'
  | 'destinationFolder'
  | 'addToFolder'
  | 'addAgain'
  | 'addingEllipsis'
  | 'addingToFolder'
  | 'assigningToFolder'
  | 'chooseFolderAndMedia'
  | 'loadingFolders'
  | 'createFolderFirst'
  | 'notInAnyFolder'
  | 'removeFromFolder'
  | 'removeFromNamed'
  | 'folderEmptyUpload'
  | 'uploadToStart'
  | 'loadingLibrary'
  | 'couldntLoadMedia'
  | 'noMediaYet'
  | 'colType'
  | 'colDimensions'
  | 'colSize'
  | 'colStatus'
  | 'selectAllPage'
  | 'pagination'
  | 'prevPage'
  | 'nextPage'
  | 'gridView'
  | 'listView'
  | 'viewMode'
  | 'previewSize'
  | 'previewSmall'
  | 'previewMedium'
  | 'previewLarge'
  | 'filtersLabel'
  | 'altPresent'
  | 'altMissing'
  | 'selectItem'
  | 'idLabel'
  | 'dismiss'
  | 'clear'
  | 'selectedWord'
  | 'bulkActions'
  | 'analyzeAi'
  | 'analyzing'
  | 'inspectUsage'
  | 'deleteItemsTitle'
  | 'deletePermanently'
  | 'deleteImmediate'
  | 'skipUsedItems'
  | 'analyzingWithAi'
  | 'waitAnalyze'
  | 'inspectingUsage'
  | 'scanningUsage'
  | 'deletingMedia'
  | 'removingSelected'
  | 'uploadMedia'
  | 'afterUpload'
  | 'dropFiles'
  | 'changeFiles'
  | 'chooseFiles'
  | 'noFilesSelected'
  | 'filesSelected'
  | 'uploadWithCount'
  | 'uploadNoAsset'
  | 'demoUploadReached'
  | 'demoUploadRemaining'
  | 'analyzeUploadDesc'
  | 'renameFileWithAi'
  | 'renameFileWithAiDesc'
  | 'fileType'
  | 'typesCount'
  | 'orientation'
  | 'landscape'
  | 'portrait'
  | 'square'
  | 'orientationsCount'
  | 'author'
  | 'authorsCount'
  | 'userNumber'
  | 'uploadedFrom'
  | 'uploadedTo'
  | 'aiStatus'
  | 'notAnalyzed'
  | 'analyzed'
  | 'skipped'
  | 'flags'
  | 'flagsCount'
  | 'missingAlt'
  | 'missingFile'
  | 'largeFiles'
  | 'largeFilesOver'
  | 'used'
  | 'unused'
  | 'otherType'
  | 'appearanceDesc'
  | 'mediaPerPage'
  | 'largeFileMb'
  | 'primaryColor'
  | 'primaryColorPicker'
  | 'primaryColorHex'
  | 'reset'
  | 'byokDesc'
  | 'defaultProvider'
  | 'selectProvider'
  | 'providerModel'
  | 'providerApiKey'
  | 'chooseProviderHint'
  | 'textGenInstructions'
  | 'textGenPlaceholder'
  | 'hideApiKey'
  | 'showApiKey'
  | 'testProvider'
  | 'testing'
  | 'queuing'
  | 'scanning'
  | 'indexLibrary'
  | 'indexLibraryDesc'
  | 'rebuildUsage'
  | 'rebuildUsageDesc'
  | 'indexToolsDesc'
  | 'failedLoadSettings'
  | 'settingsSections'
  | 'recommendedSuffix'
  | 'providerKeyHint'
  | 'setupInitial'
  | 'setupProgress'
  | 'wizardWelcome'
  | 'wizardWelcomeBody'
  | 'wizardBulletFolders'
  | 'wizardBulletFree'
  | 'wizardBulletAi'
  | 'wizardBulletPro'
  | 'metaLanguages'
  | 'metaLanguagesHint'
  | 'defaultLanguageShort'
  | 'popular'
  | 'allLanguages'
  | 'interfaceLanguage'
  | 'appearanceHint'
  | 'itemsPerPage'
  | 'largeFileHintFree'
  | 'largeFileHintPro'
  | 'libraryDefaults'
  | 'libraryDefaultsHint'
  | 'defaultView'
  | 'grid'
  | 'list'
  | 'wizardPrivacyHint'
  | 'wizardModelHint'
  | 'aiProviderOptional'
  | 'aiProviderOptionalHint'
  | 'provider'
  | 'skipForNow'
  | 'apiKey'
  | 'pasteYourKey'
  | 'wizardReady'
  | 'wizardReadyBody'
  | 'wizardReadyBodyFree'
  | 'summaryDefaultLanguage'
  | 'summaryEnabledLanguages'
  | 'summaryTheme'
  | 'summaryAi'
  | 'notConfiguredYet'
  | 'finishSetup'
  | 'continue'
  | 'back'
  | 'setupComplete'
  | 'details'
  | 'tools'
  | 'info'
  | 'editWithAi'
  | 'aiEditIntro'
  | 'aiEditPrompt'
  | 'aiEditPlaceholder'
  | 'aiEditGenerate'
  | 'aiEditIterate'
  | 'aiEditWorking'
  | 'aiEditPreview'
  | 'aiEditZoomPreview'
  | 'aiEditClosePreview'
  | 'aiEditUse'
  | 'aiEditDiscard'
  | 'aiEditConfirmTitle'
  | 'aiEditConfirmBody'
  | 'aiEditApplied'
  | 'aiEditUnavailable'
  | 'aiEditDisabled'
  | 'featAiEditLabel'
  | 'featAiEditDesc'
  | 'collapseSidebar'
  | 'expandSidebar'
  | 'closeInspector'
  | 'mediaInspector'
  | 'inspectorSections'
  | 'localeLabel'
  | 'detailsHint'
  | 'generating'
  | 'generatingAll'
  | 'generatingWithAi'
  | 'suggestingFilename'
  | 'saved'
  | 'saveFailed'
  | 'titleField'
  | 'titleHint'
  | 'altText'
  | 'altHint'
  | 'caption'
  | 'shortDescription'
  | 'captionHint'
  | 'shortDescHint'
  | 'description'
  | 'descriptionHint'
  | 'usageHeading'
  | 'rescan'
  | 'usageHint'
  | 'usageHintShort'
  | 'noUsageYet'
  | 'noUsageShort'
  | 'foldersHeading'
  | 'optimizeHeading'
  | 'optimizeDesc'
  | 'quality'
  | 'smallerFile'
  | 'higherQuality'
  | 'qualityHint'
  | 'pngCompression'
  | 'pngCompressionHint'
  | 'faster'
  | 'optimizeSourceLabel'
  | 'bytesWord'
  | 'cropRotate'
  | 'resize'
  | 'convertFormat'
  | 'removeBackground'
  | 'replaceMedia'
  | 'renameFile'
  | 'newFilename'
  | 'checking'
  | 'restoreOriginalTitle'
  | 'restoring'
  | 'restoreOriginal'
  | 'deleteOriginalTitle'
  | 'deleteOriginal'
  | 'deleteOriginalBody'
  | 'optimizeAt'
  | 'optimizing'
  | 'optimize'
  | 'replaceMediaTitle'
  | 'replacing'
  | 'replace'
  | 'renameFileTitle'
  | 'renaming'
  | 'confirmRename'
  | 'deleteMediaTitle'
  | 'changeFile'
  | 'chooseReplacement'
  | 'attachmentRecord'
  | 'fileSection'
  | 'fileSectionHint'
  | 'attachmentId'
  | 'mimeType'
  | 'extension'
  | 'megapixels'
  | 'pathLabel'
  | 'onDisk'
  | 'yes'
  | 'missing'
  | 'uploaded'
  | 'modified'
  | 'editInWp'
  | 'openAttachment'
  | 'aiAndIndex'
  | 'duplicate'
  | 'usageCountLabel'
  | 'perceptualHash'
  | 'exifCamera'
  | 'exifHint'
  | 'generatedSizes'
  | 'openSize'
  | 'apply'
  | 'applying'
  | 'confirm'
  | 'create'
  | 'onlyResizeNote'
  | 'sizePresets'
  | 'resizePresetsTitle' | 'resizePresetsHint' | 'presetLabel' | 'presetType' | 'presetWidth' | 'presetPercent' | 'presetPercentValue' | 'presetWidthValue' | 'removePreset' | 'remove' | 'addPreset' | 'newPreset'
  | 'width'
  | 'height'
  | 'unlockAspect'
  | 'lockAspect'
  | 'resizeMaxHint'
  | 'resizing'
  | 'resizeConfirm'
  | 'resizeToSize'
  | 'resizeToSizeQuestion'
  | 'onlyConvertNote'
  | 'targetFormat'
  | 'converting'
  | 'convertTo'
  | 'convertQualityHint'
  | 'onlyRemoveBgNote'
  | 'original'
  | 'cutout'
  | 'working'
  | 'noPreviewYet'
  | 'loadingModel'
  | 'downloadingModel'
  | 'removingBackground'
  | 'processing'
  | 'regeneratePreview'
  | 'generatePreview'
  | 'applyBgRemoval'
  | 'applyBgBody'
  | 'rotateAndCrop'
  | 'rotateLeft'
  | 'rotateRight'
  | 'finishCropToRotate'
  | 'cropping'
  | 'crop'
  | 'aspectRatio'
  | 'applyImageEdits'
  | 'applyEdits'
  | 'applyEditsBody'
  | 'noPreview'
  | 'resetEdits'
  | 'comparingHashes'
  | 'couldntLoadDuplicates'
  | 'loadingDuplicates'
  | 'scanLibrary'
  | 'noDuplicateGroups'
  | 'runScanHint'
  | 'duplicatesPagination'
  | 'nearDuplicate'
  | 'exactDuplicate'
  | 'healthScores'
  | 'indexedLabel'
  | 'aiAnalyzed'
  | 'altCoverage'
  | 'inUse'
  | 'refreshing'
  | 'allClear'
  | 'noIssues'
  | 'viewIssue'
  | 'issuesHeading'
  | 'indexIncomplete'
  | 'indexIncompleteBody'
  | 'indexing'
  | 'indexingTitle'
  | 'indexWaitFinish'
  | 'indexWaitAll'
  | 'indexedOf'
  | 'unusedTitle'
  | 'unusedHint'
  | 'queueRescan'
  | 'unusedEmpty'
  | 'pickerFolderEmpty'
  | 'pickerNoMatches'
  | 'noMediaFound'
  | 'checkSingular'
  | 'checksPlural'
  | 'sysEnvironment'
  | 'sysExtensions'
  | 'sysFilesystem'
  | 'sysDatabase'
  | 'sysJobs'
  | 'sysCapabilities'
  | 'sysAi'
  | 'sysIndex'
  | 'sysPhpVersion'
  | 'sysWpVersion'
  | 'sysDbVersion'
  | 'sysMemory'
  | 'sysMaxUpload'
  | 'sysMultisite'
  | 'sysImageLib'
  | 'sysWebp'
  | 'sysAvif'
  | 'sysUploadsDir'
  | 'sysPluginPath'
  | 'sysDbTables'
  | 'sysSchema'
  | 'sysActionScheduler'
  | 'sysWpCron'
  | 'sysCronHook'
  | 'sysCaps'
  | 'sysAiDefault'
  | 'sysMediaCount'
  | 'sysIndexCoverage'
  | 'issueOrphan'
  | 'issueOrphanHint'
  | 'issueUnused'
  | 'issueUnusedHint'
  | 'issueDup'
  | 'issueDupHint'
  | 'issueAlt'
  | 'issueAltHint'
  | 'issueAiFailed'
  | 'issueAiFailedHint'
  | 'issueLarge'
  | 'issueLargeHint'
  | 'issueMissingFiles'
  | 'issueMissingFilesHint'
  | 'issueUnindexed'
  | 'issueUnindexedHint'
  | 'aiPowered'
  | 'standard'
  | 'freeTier'
  | 'enableFeature'
  | 'modelLabel'
  | 'analyzedAt'
  | 'openInBuilder'
  | 'replaceHint'
  | 'renameHint'
  | 'deleteMediaBody'
  | 'restoreBody'
  | 'optimizeBody'
  | 'renameBody'
  | 'renameReferencesHint'
  | 'replaceBody'
  | 'featUploadLabel'
  | 'featUploadDesc'
  | 'featFoldersLabel'
  | 'featFoldersDesc'
  | 'featFiltersLabel'
  | 'featFiltersDesc'
  | 'featBulkLabel'
  | 'featBulkDesc'
  | 'featModalLabel'
  | 'featModalDesc'
  | 'featSmartLabel'
  | 'featSmartDesc'
  | 'featAnalysisLabel'
  | 'featAnalysisDesc'
  | 'featMetaLabel'
  | 'featMetaDesc'
  | 'featBulkAltLabel'
  | 'featBulkAltDesc'
  | 'featMultiLabel'
  | 'featMultiDesc'
  | 'featDupLabel'
  | 'featDupDesc'
  | 'featUnusedLabel'
  | 'featUnusedDesc'
  | 'featUsageLabel'
  | 'featUsageDesc'
  | 'featHealthLabel'
  | 'featHealthDesc'
  | 'featSystemLabel'
  | 'featSystemDesc'
  | 'featOptimizeLabel'
  | 'featOptimizeDesc'
  | 'featEditLabel'
  | 'featEditDesc'
  | 'featResizeLabel'
  | 'featResizeDesc'
  | 'featConvertLabel'
  | 'featConvertDesc'
  | 'featRmbgLabel'
  | 'featRmbgDesc'
  | 'featReplaceLabel'
  | 'featReplaceDesc'
  | 'featRenameLabel'
  | 'featRenameDesc'
  | 'featAiRenameLabel'
  | 'featAiRenameDesc'
  | 'featWhiteLabelLabel'
  | 'featWhiteLabelDesc'
  | 'whiteLabelTitle'
  | 'whiteLabelHint'
  | 'whiteLabelLogo'
  | 'whiteLabelLogoHint'
  | 'whiteLabelIcon'
  | 'whiteLabelIconHint'
  | 'whiteLabelUpload'
  | 'whiteLabelReplace'
  | 'whiteLabelRemove'
  | 'whiteLabelSaved'
  | 'whiteLabelRemoved'
  | 'whiteLabelUploadFailed'
  | 'whiteLabelFileType'
  | 'whiteLabelTooLarge'
  | 'rangeOf'
  | 'pageOf'
  | 'ringAttachments'
  | 'ringIndexed'
  | 'ringUnused'
  | 'ringMissingAlt'
  | 'ringChecks'
  | 'inspectorHeading'
  | 'inspectorEmpty'
  | 'loadingFileDetails'
  | 'foldersVirtualHint'
  | 'optimizeButton'
  | 'cropToolHint'
  | 'resizeCurrent'
  | 'convertConfirm'
  | 'convertReferencesNotice'
  | 'removeBgRuns'
  | 'cropRotateHint'
  | 'missingAttachment'
  | 'wpSection'
  | 'usesCount'
  | 'perPageHint'
  | 'largeFileSettingsHint'
  | 'accentHint'
  | 'textGenHint'
  | 'modelHint'
  | 'providerUsedFor'
  | 'configuredSuffix'
  | 'savedSuffix'
  | 'keepKeyPlaceholder'
  | 'retry'
  | 'relaunchShort'
  | 'modalSearchHint'
  | 'severityWarn'
  | 'severityInfo'
  | 'severityError'
  | 'deleteMedia'
  | 'assignFolderHint'
  | 'renameExtHint'
  | 'renameMissingExtHint'
  | 'resizeToolDesc'
  | 'convertToolDesc'
  | 'removeBgToolDesc'
  | 'aiIndexHint'
  | 'generatedSizesHint'
  | 'noExif'
  | 'noExifFormat'
  | 'cropRatioHint'
  | 'cropAfterRotate'
  | 'usesCountOne'
  | 'statusUnknown'
  | 'statusNone'
  | 'dupUnique'
  | 'dupExact'
  | 'dupNear'
  | 'optOptimized'
  | 'optSkipped'
  | 'optFailed'
  | 'confHigh'
  | 'confMedium'
  | 'confLow'
  | 'confUnknown'
  | 'aspectFree'
  | 'sessionExpired'
  | 'requestFailed'
  | 'requestFailedHtml'
  | 'requestFailedHttp'
  | 'aiQueueFailed'
  | 'jobRunnerTimeout'
  | 'altPreviewTimeout'
  | 'uploadNetworkError'
  | 'optimizePreviewTimeout'
  | 'optimizeTimeout'
  | 'restoreTimeout'
  | 'removeBgNetworkError'
  | 'replaceNetworkError'
  | 'suggestNameFailed'
  | 'providerTestTimeout'
  | 'licenseTimeout'
  | 'bgLibLoadFailed'
  | 'uploadItemFailed'
  | 'mediaTabPlaceholder'
  | 'contextMenuLabel'
  | 'openDetails'
  | 'copyFilename'
  | 'toastFilenameCopied'
  | 'toastFilenameCopyFailed';

export type Catalog = Partial<Record<MessageKey, string>>;

const en: Catalog = {
  ...aiEditMessagesEn,
  ...videoMessagesEn,
  providerModelSearch: "Search models…",
  providerModelCustom: "Custom model ID",

  providerModelsHint: "Choose a model or enter its API ID. Requires image input and JSON output. Save your API key before refreshing.",
  providerModelsRefresh: "Refresh models",
  providerModelsFallback: "{count} models in the built-in catalog. Availability depends on your provider account.",
  providerModelsLive: "{count} compatible models from the provider catalog.",

  bulkAiChooseFields: "Choose which fields to replace for {count} selected media, across enabled languages. Unchecked fields will stay unchanged.",
  bulkAiFilename: "Filename",
  bulkFolderConfirmTitle: "Confirm folder assignment",
  bulkFolderConfirmBody: "Add {count} selected media to “{folder}”? Files stay in uploads.",

  generateAllConfirmBody: "This will replace the title, ALT text, caption and description in the languages you choose below.",
  generateAllRenameFilename: "Also regenerate the filename",
  generateAllRenameUnavailable: "Enable Rename file in Features to regenerate the filename.",
  translateOtherLanguagesBody: "The current language is {language}. Choose whether to generate only this language or translate into the others too.",
  translateOtherLanguagesOption: "Also translate into the other enabled languages",

  used: "Used",
  orderBy: "Order by",
  orderDefault: "Default order",
  orderNewest: "Newest first",
  orderOldest: "Oldest first",
  orderTitleAsc: "Title A–Z",
  orderTitleDesc: "Title Z–A",
  orderLargest: "Largest first",
  orderSmallest: "Smallest first",
  orderMostUsed: "Most used",
  orderLeastUsed: "Least used",
  scanQueuedBackground: "Scan queued. It continues in the background.",
  scanBackgroundProgress: "{label}: {current} of {total} media · {percent}%. You can leave this page.",
  scanComparingProgress: "Comparing images · {percent}%. You can leave this page.",
  scanComparingTitle: "Comparing images",
  scanBackgroundHint: "Continues safely in the background",
  scanProgressCount: "{current} of {total} media processed",
  scanFailedBackground: "Scan interrupted. You can resume from the last saved batch.",
  scanInterruptedTitle: "Scan interrupted",
  scanInterruptedBody: "Your progress is saved. Resume from the last completed batch when you’re ready.",
  resumeScan: "Resume scan",
  scanCompleteBackground: "Scan completed.",
  unusedScanNeeded: "Run a complete usage scan before reviewing unused media. Unscanned files are excluded.",
  unusedSafetyWarning: "No indexed references does not guarantee a file is unused. Review each file and keep a backup before deleting.",
  groupPreviewLimited: "Showing {shown} of {total} files in this group.",
  unusedPagination: "Unused media pages",

  title: 'FoldRocket',
  library: 'Library',
  duplicates: 'Duplicates',
  health: 'Health',
  system: 'System',
  settings: 'Settings',
  features: 'Features',
  search: 'Search media…',
  newFolder: 'New folder',
  newSubfolder: 'Add Subfolder',
  newSubfolderTitle: 'New subfolder in {name}',
  downloadZip: 'Download zip',
  downloadZipBusy: 'Preparing zip…',
  downloadZipEmpty: 'Nothing to download in this view.',
  downloadZipTooMany: 'This view has too many files for one zip.',
  downloadZipFailed: 'Could not create the zip.',
  folderColor: 'Select color',
  folderColorRemove: 'Remove color',
  moveFolder: 'Move',
  moveFolderTo: 'Move to',
  moveFolderRoot: 'Top level',
  reorderBefore: 'Move before previous item',
  reorderAfter: 'Move after next item',
  reorderStart: 'Move to start',
  reorderEnd: 'Move to end',
  reorderMoved: '{name} moved to position {position}.',
  smartViews: 'Smart views',
  smartViewAll: 'All',
  smartViewUnused: 'Unused media',
  smartViewMissingAlt: 'Missing ALT',
  smartViewLargeFiles: 'Large files (>{mb} MB)',
  smartViewUnanalyzed: 'Unanalyzed',
  foldersNav: 'Folders',
  smartViewSave: 'Save',
  smartViewSaveCurrent: 'Save current filters as a smart view',
  smartViewSaveNeedFilters: 'Apply at least one filter first',
  smartViewSaveTitle: 'Save smart view',
  smartViewName: 'Name',
  smartViewNamePlaceholder: 'e.g. Campaign JPEGs, Pending AI',
  smartViewRename: 'Rename',
  smartViewUpdateFilters: 'Update filters',
  smartViewUpdateTitle: 'Update smart view filters?',
  smartViewUpdateBody: 'Replace the filters for “{name}” with the ones currently active in the library.',
  smartViewDelete: 'Delete',
  smartViewDeleteBody: 'Delete smart view “{name}”? This does not delete any media files.',
  smartViewsEmpty: 'No custom smart views yet. Apply filters, then save a view.',
  toastSmartViewCreated: 'Smart view saved.',
  toastSmartViewCreateFailed: 'Couldn’t save the smart view.',
  toastSmartViewRenamed: 'Smart view renamed.',
  toastSmartViewRenameFailed: 'Couldn’t rename the smart view.',
  toastSmartViewUpdated: 'Smart view filters updated.',
  toastSmartViewUpdateFailed: 'Couldn’t update the smart view.',
  toastSmartViewDeleted: 'Smart view deleted.',
  toastSmartViewDeleteFailed: 'Couldn’t delete the smart view.',
  upload: 'Upload',
  uploading: 'Uploading…',
  analyze: 'Analyze with AI',
  generateWithAi: 'Generate with AI',
  generateAllData: 'Generate all data with AI',
  empty: 'No media found.',
  loading: 'Loading…',
  error: 'Something went wrong.',
  main: 'Main',
  refresh: 'Refresh',
  refreshed: 'Library updated.',
  resyncQueued: '{count} items queued for indexing.',
  pageLibraryTitle: 'Media Library',
  pageLibrarySubtitle: 'Organize, enrich and clean media across your WordPress site.',
  pageDuplicatesTitle: 'Duplicates',
  pageDuplicatesSubtitle: 'Find duplicate files in the library. Nothing is deleted automatically.',
  pageHealthTitle: 'Health',
  pageHealthSubtitle: 'Library vitals, issues and optimization opportunities.',
  pageSystemTitle: 'System',
  pageSystemSubtitle: 'Verify PHP libraries, WordPress capabilities and runtime requirements.',
  pageSettingsTitle: 'Settings',
  pageSettingsSubtitle: 'Providers, languages, appearance, privacy and maintenance.',
  pageFeaturesTitle: 'Features',
  pageFeaturesSubtitle: 'Enable or disable product modules. High-powered features use more resources or AI credits.',
  languagesTitle: 'Languages',
  languagesDescription: 'Locales for multilingual metadata.',
  toolLanguage: 'Tool language',
  toolLanguageHint: 'Language of the FoldRocket admin interface.',
  defaultLanguage: 'Default metadata language',
  defaultLanguageHint: 'Used as the primary locale in the inspector and when generating metadata.',
  enabledLanguages: 'Enabled metadata languages',
  enabledLanguagesHint:
    'Only enabled languages appear in the inspector locale switcher. The default cannot be disabled.',
  defaultLocked: 'default',
  settingsSaved: 'Settings saved.',
  followWordPress: 'Match WordPress',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  themeHint: 'Light, dark, or match the operating system.',
  mediaTabLabel: 'Name',
  mediaTabLabelHint:
    'Renames the tab in the WordPress media window and the FoldRocket item in the left admin menu. The menu updates as you type. Leave empty for the defaults.',
  tabAppearance: 'Appearance',
  tabConfiguration: 'Configuration',
  configurationDesc: 'Configure resize presets and the default folder color palette.',
  folderPaletteTitle: 'Folder color palette',
  folderPaletteHint: 'Choose the default colors available when assigning a color to a folder.',
  paletteColor: 'Palette color {index}',
  removePaletteColor: 'Remove palette color',
  addPaletteColor: 'Add color',
  tabLanguages: 'Languages',
  tabAi: 'AI provider',
  tabPrivacy: 'Privacy',
  tabMaintenance: 'Maintenance',
  tabImport: 'Import',
  importFoldersLead: 'Copy folders from another media plugin. Files stay in the same place.',
  importHappyFilesMissing: 'No HappyFiles folders were found.',
  importHappyFilesSummary: '{folders} folders and {files} files.',
  importHappyFilesAction: 'Import',
  importHappyFilesWorking: 'Importing…',
  importHappyFilesDone: 'HappyFiles folders are in the library.',
  importHappyFilesDisabled: 'Turn on Import folders in Features to use this.',
  importRealMediaMissing: 'No Real Media Library folders were found.',
  importRealMediaAction: 'Import',
  importRealMediaDone: 'Real Media Library folders are in the library.',
  importFileBirdMissing: 'No FileBird folders were found.',
  importFileBirdAction: 'Import',
  importFileBirdDone: 'FileBird folders are in the library.',
  importWpMediaFolderMissing: 'No WP Media Folder folders were found.',
  importWpMediaFolderAction: 'Import',
  importWpMediaFolderDone: 'WP Media Folder folders are in the library.',
  tabLicense: 'License',
  licenseTitle: 'License',
  licenseDescription:
    'Unlock Pro features (AI, insights, image tools) with a FoldRocket license key. Free edition works without a key. Manage plans at foldrocket.com.',
  licenseLockedDescription:
    'This demo includes Pro for the whole session. The license cannot be changed or deactivated.',
  licenseKey: 'License key',
  licenseKeyHint: 'Format: FRKT-XXXX-XXXX-XXXX-XXXX — sent by email after purchase.',
  licenseActivate: 'Activate',
  licenseDeactivate: 'Deactivate',
  licenseActivating: 'Verifying…',
  licenseStatusActive: 'License active',
  licenseStatusInactive: 'Not activated',
  licenseStatusInvalid: 'Invalid or expired license',
  licenseWhereCode: 'Manage license / downloads',
  licenseBuyCta: 'Buy Pro',
  licenseDomain: 'Domain',
  licensePlan: 'Plan',
  licenseExpires: 'Expires',
  licenseSites: 'Sites',
  licenseBannerTitle: 'Unlock Pro',
  licenseGateBody:
    'You are on the Free edition. Enter a license key to unlock AI, insights, and image tools.',
  licenseBannerCta: 'Open License settings',
  licenseUnlockPro: 'Unlock Pro',
  freeBannerTitle: 'Free edition',
  freeBannerBody:
    'Library, folders, filters, and upload are available. Unlock Pro for AI, duplicates, health, and image tools.',
  freeBannerDismiss: 'Dismiss',
  proUpgradeTitle: 'FoldRocket Pro',
  proUpgradeBody:
    'AI analysis, metadata, duplicates, health, and image tools are in Pro.',
  freeEditionTag: 'Free edition',
  proFeatureLocked: 'Requires Pro — activate a license to unlock.',
  featuresFreeNote:
    'You are on Free. Pro modules are locked until you activate a license.',
  featuresLoading: 'Loading…',
  featuresLoadFailed: 'Couldn’t load features',
  featuresIntro:
    'Enable or disable every product module. AI-powered features use your configured providers (BYOK).',
  featuresAiNote: ' = vision, metadata, or commands that call an AI provider.',
  featuresProNote: ' = requires an active license.',
  featuresColFeature: 'Feature',
  featuresColType: 'Type',
  featuresColStatus: 'Status',
  catLibrary: 'Library',
  catSearch: 'Search',
  catAi: 'AI',
  catInsights: 'Insights',
  catTools: 'Tools',
  catIntegrations: 'Integrations',
  catSystem: 'System',
  privacyTitle: 'Privacy when using AI',
  privacyDescription:
    'Local-first by default. These options apply when you send images to a BYOK provider.',
  privacyStripExif: 'Strip EXIF before sending to AI',
  privacyStripExifDesc:
    'Removes camera, GPS, and other EXIF metadata from the image payload before it reaches your AI provider.',
  privacySendReduced: 'Send reduced-size previews only',
  privacySendReducedDesc:
    'Uploads a smaller preview for analysis instead of the full file, cutting bandwidth and limiting what leaves your server.',
  privacyNeverOriginals: 'Never send original full-resolution files',
  privacyNeverOriginalsDesc:
    'Blocks sending the original upload file to any AI provider, even if a reduced preview is unavailable.',
  uninstallDataLabel: 'Data on uninstall',
  uninstallKeep: 'Keep plugin data',
  uninstallDelete: 'Delete plugin data on uninstall',
  uninstallHint: 'WordPress media files are never removed by this plugin.',
  relaunchWizard: 'Relaunch wizard',
  relaunchWizardHint:
    'Run the first-time setup again. Your current settings stay until you finish and save the wizard.',
  relaunchWizardConfirmTitle: 'Relaunch setup wizard?',
  relaunchWizardConfirmBody:
    'You’ll go through the setup steps again (languages, appearance, privacy, AI). Existing settings are kept until you complete the wizard.',
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',
  systemPass: 'OK',
  systemWarn: 'Warning',
  systemFail: 'Fail',
  systemInfo: 'Info',
  systemAllGood: 'All required checks passed',
  systemNeedsAttention: 'Some required checks failed',
  systemSummary: '{pass} passed · {warn} warnings · {fail} failed',
  systemCheck: 'Check',
  systemValue: 'Current',
  systemIdeal: 'Ideal',
  systemStatus: 'Status',
  systemGroupOk: 'All good',
  systemGroupWarn: 'Warnings',
  systemGroupFail: 'Issues',
  systemRequiredNote: '* Required for full plugin operation. AI providers are optional (BYOK).',
  toastChangesSaved: 'Changes saved.',
  toastChangesSaveFailed: 'Couldn’t save changes. Try again.',
  toastOptimized: 'Image optimized — saved {bytes} bytes at {quality}%.',
  toastOptimizeSkipped: 'Optimization skipped for this file.',
  toastOptimizeFailed: 'Couldn’t optimize this image.',
  toastRestored: 'Original image restored.',
  toastOriginalDeleted: 'Original backup permanently deleted.',
  toastOriginalDeleteFailed: 'Could not delete the original backup.',
  toastRestoreFailed: 'Couldn’t restore the original image.',
  toastReplaced: 'File replaced. Attachment ID unchanged.',
  toastReplaceFailed: 'Couldn’t replace this file.',
  toastRenamed: 'File renamed. Site URLs updated.',
  toastRenameFailed: 'Couldn’t rename this file.',
  toastRenameAiSuggested: 'AI filename suggestion ready — review and confirm rename.',
  toastRenameAiFailed: 'Couldn’t suggest a filename. Check your AI provider.',
  toastAiAllSaved: 'AI metadata saved.',
  toastAiFieldSaved: '{field} updated.',
  toastAiFailed: 'AI generation failed. Check your provider settings.',
  toastAiNoApiKey: 'No AI API key is configured. Add a key in Settings → AI provider.',
  toastAiCancelled: 'AI generation cancelled.',
  toastAiQueued: 'AI generation started. Fields will update when it finishes.',
  cancelAiGeneration: 'Cancel',
  inspectorPrev: 'Previous media',
  inspectorNext: 'Next media',
  inspectorClose: 'Close',
  toastUsageUpdated: 'Usage updated — {count} location(s) found.',
  toastUsageFailed: 'Couldn’t rescan usage for this file.',
  toastTrashed: 'File deleted.',
  toastTrashFailed: 'Couldn’t delete this file.',
  toastUrlCopied: 'URL copied to clipboard.',
  toastUrlCopyFailed: 'Couldn’t copy the URL.',
  inspectorCopyUrl: 'Copy URL',
  inspectorDownload: 'Download',
  toastImageEdited: 'Image updated. Thumbnails regenerated.',
  toastImageEditFailed: 'Couldn’t apply crop or rotation.',
  toastResized: 'Resized to {size}.',
  toastResizeFailed: 'Couldn’t resize this image.',
  toastConverted: 'Converted to {format}.',
  toastConvertedReferences: 'Converted to {format}. Updated {count} content records using the old file URL.',
  toastConvertFailed: 'Couldn’t convert this image.',
  toastBulkConvertMissing: '{count} image(s) could not be converted because the source file is missing.',
  toastBulkConvertPartial: '{failed} of {total} image(s) could not be converted. The original files were left unchanged.',
  toastRemoveBgApplied: 'Background removed. Saved as transparent PNG.',
  toastRemoveBgFailed: 'Couldn’t remove the background.',
  toastFolderCreated: 'Folder created.',
  toastFolderCreateFailed: 'Couldn’t create the folder.',
  toastFolderRenamed: 'Folder renamed.',
  toastFolderRenameFailed: 'Couldn’t rename the folder.',
  toastFolderMoved: 'Folder moved.',
  toastFolderMoveFailed: 'Couldn’t move the folder.',
  toastFolderDeleted: 'Folder deleted. Media files were kept.',
  toastFolderDeletedWithMedia:
    'Folder deleted. {count} media item(s) unlinked — files were kept.',
  toastFolderDeleteFailed: 'Couldn’t delete the folder.',
  toastAddedToFolder: 'Added to folder.',
  toastAddedToFolderMany: 'Added {count} items to folder.',
  toastFolderAssignFailed: 'Couldn’t add media to this folder.',
  toastRemovedFromFolder: 'Removed from folder.',
  toastFolderUnassignFailed: 'Couldn’t remove media from this folder.',
  toastFeaturesSaved: 'Features updated.',
  toastFeaturesSaveFailed: 'Couldn’t update features.',
  toastUploadOk: '{count} file(s) uploaded.',
  toastUploadPartial: '{ok} uploaded, {failed} failed.',
  toastUploadFailed: 'Upload failed. Try again.',
  toastUploading: 'Uploading {current}/{total}…',
  toastIndexQueued: '{count} attachment(s) queued for indexing.',
  toastUsageRebuildDone: 'Usage index rebuilt for {count} attachment(s).',
  toastDuplicatesScanned:
    'Duplicate scan complete — {hashed} hashed, {groups} group(s).',
  toastUnusedRescanQueued: '{count} item(s) queued for a usage rescan.',
  toastUnusedRescanStarted: 'Usage rescan queued.',
  toastBulkAnalyzeQueued: 'AI analysis finished for {count} item(s).',
  toastBulkUsageScanned: 'Usage scanned for {count} item(s).',
  toastBulkUsageQueued: 'Usage scan queued for {count} item(s).',
  toastBulkTrashed: '{count} item(s) deleted.',
  toastBulkTrashPartial: '{trashed} deleted. {skipped} skipped.',
  bulkAltAction: 'Generate ALT',
  bulkAltConfirmTitle: 'Generate ALT text?',
  bulkAltConfirmBody:
    'Generate and apply ALT text for {count} selected item(s). Changes are written to WordPress as each item completes.',
  bulkAltConfirmNote: 'Uses your AI provider. Already-analyzed items are reused when possible.',
  bulkAltConfirmAction: 'Generate & apply ({count})',
  bulkAltGeneratingTitle: 'Generating ALT…',
  bulkAltGenerating: 'Generating and applying ALT text…',
  bulkAltProgressCount: '{current} / {total}',
  bulkAltRetry: 'Try again',
  bulkAltColFile: 'File',
  bulkAltColResult: 'Result',
  bulkAltColAlt: 'ALT text',
  bulkAltEmpty: '(empty)',
  bulkAltFailed: 'Could not generate',
  bulkAltTooMany: 'Select at most {max} items for bulk ALT.',
  bulkAltRecapTitle: 'ALT generation complete',
  bulkAltRecapSummary: '{applied} applied · {failed} failed · {skipped} skipped',
  bulkAltRecapDone: 'Done',
  bulkAltRecapSkipped: 'Not applied',
  bulkAltStatusApplied: 'Applied',
  bulkAltStatusFailed: 'Failed',
  bulkAltStatusSkipped: 'Skipped',
  toastBulkAltApplied: 'Applied ALT text to {count} item(s).',
  toastBulkAltPreviewFailed: 'Could not generate ALT text.',
  toastBulkAltApplyFailed: 'Could not apply ALT text.',
  toastCommandFailed: 'Command failed. Try a different phrase.',
  toastSettingsSaved: 'Settings saved.',
  toastGenericError: 'Something went wrong. Try again.',
  overviewIntroTitle: 'Your library is ready',
  overviewIntroBody:
    'Files stay in the uploads folder. Folders, filters, and upload work here without moving anything on disk.',
  overviewFoldersTitle: 'Virtual folders',
  overviewFoldersBody: 'Group media into folders. The files stay where WordPress saved them.',
  overviewFiltersTitle: 'Search and filters',
  overviewFiltersBody: 'Find files by name, type, date, and other details.',
  overviewUploadTitle: 'Upload',
  overviewUploadBody: 'Add new files from here. They show up in the library as soon as the upload finishes.',
  overviewGridTitle: 'Open a file',
  overviewGridBody: 'Click an item to edit its title, ALT text, and caption.',
  overviewMediaTitle: 'This file',
  overviewMediaBody: 'Title, ALT text, and caption are edited here. Changes save on their own.',
  overviewSettingsTitle: 'Settings',
  overviewSettingsBody: 'Change the language, appearance, and library options you chose in the wizard.',
  overviewBack: 'Back',
  overviewNext: 'Next',
  overviewSkip: 'Skip',
  overviewDone: 'Done',
  overviewProgress: '{current} of {total}',
  allMedia: "All media",
  noFoldersYet: "No folders yet. Create one to organize without moving files.",
  folderName: "Folder name",
  folderNamePlaceholder: "e.g. Products, Team, Campaigns",
  createFolder: "Create folder",
  folderNameRequired: "Folder name is required.",
  deleting: "Deleting…",
  deleteFolder: "Delete folder",
  deleteFolderTitle: "Delete “{name}”?",
  deleteUnlinkCount: "Delete & unlink {count}",
  folderEmpty: "This folder is empty.",
  folderUnlinkBody: "{count} media item(s) will be unlinked from this folder.",
  folderFilesStay: "Files stay in the library. Nothing is moved or deleted from disk.",
  folderChildrenMove: "{count} subfolder(s) will move up one level.",
  chooseFolder: "Choose folder…",
  destinationFolder: "Destination folder",
  addToFolder: "Add to folder",
  addAgain: "Add again",
  addingEllipsis: "Adding…",
  addingToFolder: "Adding to folder",
  assigningToFolder: "Assigning the selected media to the chosen folder.",
  chooseFolderAndMedia: "Choose a folder and at least one media item.",
  loadingFolders: "Loading folders…",
  createFolderFirst: "Create a folder in the sidebar first.",
  notInAnyFolder: "Not in any folder yet.",
  removeFromFolder: "Remove from folder",
  removeFromNamed: "Remove from {name}",
  folderEmptyUpload: "This folder is empty. Upload files or move media here from the library.",
  uploadToStart: "Upload files to get started. They will be indexed automatically.",
  loadingLibrary: "Loading library",
  couldntLoadMedia: "Couldn’t load media",
  noMediaYet: "No media yet",
  colType: "Type",
  colDimensions: "Dimensions",
  colSize: "Size",
  colStatus: "Status",
  selectAllPage: "Select all on this page",
  pagination: "Pagination",
  prevPage: "Previous page",
  nextPage: "Next page",
  gridView: "Grid view",
  listView: "List view",
  viewMode: "View mode",
  previewSize: "Preview size",
  previewSmall: "Small previews",
  previewMedium: "Medium previews",
  previewLarge: "Large previews",
  filtersLabel: "Filters",
  altPresent: "ALT text present",
  altMissing: "ALT text missing",
  selectItem: "Select {name}",
  idLabel: "ID {id}",
  dismiss: "Dismiss",
  clear: "Clear",
  selectedWord: "selected",
  bulkActions: "Bulk actions",
  analyzeAi: "Analyze with AI",
  analyzing: "Analyzing…",
  inspectUsage: "Inspect usage",
  deleteItemsTitle: "Delete {count} items permanently?",
  deletePermanently: "Delete permanently",
  deleteImmediate: "Files are removed from the media library right away. This cannot be undone.",
  skipUsedItems: "Skip items that are already in use",
  analyzingWithAi: "Analyzing with AI",
  waitAnalyze: "Please wait until every selected item is analyzed.",
  inspectingUsage: "Inspecting usage",
  scanningUsage: "Scanning where each selected item is used on the site.",
  deletingMedia: "Deleting media",
  removingSelected: "Removing the selected items from the media library.",
  uploadMedia: "Upload media",
  afterUpload: "After upload",
  dropFiles: "Drop files to upload",
  changeFiles: "Change files",
  chooseFiles: "Choose files",
  noFilesSelected: "No files selected",
  filesSelected: "{count} files selected",
  uploadWithCount: "Upload ({count})",
  uploadNoAsset: "Upload succeeded but no file was returned.",
  demoUploadReached: "This demo allows up to {max} uploads. The limit has been reached.",
  demoUploadRemaining: "This demo allows up to {max} uploads ({remaining} remaining).",
  analyzeUploadDesc: "Generate a description, tags, and metadata with your vision provider.",
  renameFileWithAi: "Rename file with AI",
  renameFileWithAiDesc: "Choose a descriptive filename and update matching URLs on the site. You confirm the rename.",
  fileType: "File type",
  typesCount: "{count} types",
  orientation: "Orientation",
  landscape: "Landscape",
  portrait: "Portrait",
  square: "Square",
  orientationsCount: "{count} orientations",
  author: "Author",
  authorsCount: "{count} authors",
  userNumber: "User #{id}",
  uploadedFrom: "Uploaded from",
  uploadedTo: "Uploaded to",
  aiStatus: "AI status",
  notAnalyzed: "Not analyzed",
  analyzed: "Analyzed",
  skipped: "Skipped",
  flags: "Flags",
  flagsCount: "{count} flags",
  missingAlt: "Missing ALT",
  missingFile: "Missing file",
  largeFiles: "Large files",
  largeFilesOver: "Large files (>{mb} MB)",
  unused: "Unused",
  otherType: "Other",
  appearanceDesc: "How the library looks and how many items load per page.",
  mediaPerPage: "Media per page",
  largeFileMb: "Large file threshold (MB)",
  primaryColor: "Primary color",
  primaryColorPicker: "Primary color picker",
  primaryColorHex: "Primary color hex",
  reset: "Reset",
  byokDesc: "Bring your own key. Keys are encrypted on the server and never sent back to the browser.",
  defaultProvider: "Default provider",
  selectProvider: "Select a provider…",
  providerModel: "{name} model",
  providerApiKey: "{name} API key",
  chooseProviderHint: "Choose a provider to set the model and API key.",
  textGenInstructions: "Text generation instructions",
  textGenPlaceholder: "e.g. Write ALT text in a concise, SEO-friendly tone. Avoid brand names. Keep captions short and factual.",
  hideApiKey: "Hide API key",
  showApiKey: "Show API key",
  testProvider: "Test provider",
  testing: "Testing…",
  queuing: "Queuing…",
  scanning: "Scanning…",
  indexLibrary: "Index and scan library",
  indexLibraryDesc: "Refresh every attachment and rebuild where each file is used across content and supported builders.",
  rebuildUsage: "Rebuild usage index",
  rebuildUsageDesc: "Rescan where media is used in content and builders.",
  indexToolsDesc: "Background index tools. Safe to run anytime. Nothing is deleted.",
  failedLoadSettings: "Couldn’t load settings.",
  settingsSections: "Settings sections",
  recommendedSuffix: "(recommended)",
  providerKeyHint: "API key for this provider. Stored encrypted on the server.",
  setupInitial: "Initial setup",
  setupProgress: "Setup progress",
  wizardWelcome: "Welcome",
  wizardWelcomeBody: "Let’s set up FoldRocket for this site. You can change everything later in Settings and Features.",
  wizardBulletFolders: "Local media library with virtual folders",
  wizardBulletFree: "Filters, upload, and the media inspector",
  wizardBulletAi: "Optional AI analysis with your own API keys (BYOK)",
  wizardBulletPro: "Multilingual metadata, health scores, and optimization tools",
  metaLanguages: "Metadata languages",
  metaLanguagesHint: "Choose which languages to enable for titles, captions, and descriptions.",
  defaultLanguageShort: "Default language",
  popular: "Popular",
  allLanguages: "All languages ({count})",
  interfaceLanguage: "Interface language",
  appearanceHint: "Theme, accent color, and interface language.",
  itemsPerPage: "Items per page",
  largeFileHintFree: "Used by the large-files filter.",
  largeFileHintPro: "Used by the large-files filter and health warnings.",
  libraryDefaults: "Library defaults",
  libraryDefaultsHint: "How the media grid behaves day to day.",
  defaultView: "Default view",
  grid: "Grid",
  list: "List",
  wizardPrivacyHint: "Everything stays on your site unless you send images to an AI provider.",
  wizardModelHint: "Choose the model FoldRocket should use. You can change it later in AI Settings.",
  aiProviderOptional: "AI provider (optional)",
  aiProviderOptionalHint: "Bring your own key. You can skip this and add a provider later in Settings. The library works without AI.",
  provider: "Provider",
  skipForNow: "Skip for now",
  apiKey: "API key",
  pasteYourKey: "Paste your key",
  wizardReady: "You’re ready",
  wizardReadyBody: "We’ll save your choices and open the library. If this site already has media, open Health afterward to index it.",
  wizardReadyBodyFree: "We’ll save your choices and open the library.",
  summaryDefaultLanguage: "Default language: {value}",
  summaryEnabledLanguages: "Enabled languages: {count}",
  summaryTheme: "Theme: {value}",
  summaryAi: "AI: {value}",
  notConfiguredYet: "Not configured yet",
  finishSetup: "Finish setup",
  continue: "Continue",
  back: "Back",
  setupComplete: "Setup complete. Welcome to FoldRocket.",
  details: "Details",
  tools: "Tools",
  info: "Info",
  closeInspector: "Close inspector",
  mediaInspector: "Media inspector",
  inspectorSections: "Inspector sections",
  localeLabel: "Language",
  detailsHint: "Edit metadata for the selected language. Changes save automatically.",
  generating: "Generating…",
  generatingAll: "Generating all data…",
  generatingWithAi: "Generating with AI…",
  suggestingFilename: "Suggesting a filename…",
  saved: "Saved",
  saveFailed: "Couldn’t save",
  titleField: "Title",
  titleHint: "Display name for this file in the library and on the attachment page.",
  altText: "ALT text",
  altHint: "Text read by screen readers and used by search engines when the image cannot be seen.",
  caption: "Caption",
  shortDescription: "Short description",
  captionHint: "Optional text shown with the image in posts, galleries, and blocks.",
  shortDescHint: "Brief summary shown with this file in posts or media embeds.",
  description: "Description",
  descriptionHint: "Longer text about this file. Used in the attachment page and as AI context.",
  usageHeading: "Usage ({count})",
  rescan: "Rescan",
  usageHint: "Places where this file is referenced. Rescan after you insert it into content.",
  usageHintShort: "Places where this file is referenced.",
  noUsageYet: "No usages indexed yet. Rescan after you insert the image into a page.",
  noUsageShort: "No usages indexed yet.",
  foldersHeading: "Folders",
  optimizeHeading: "Optimization",
  optimizeDesc: "Optimizes the file currently used by WordPress for this attachment. A backup is kept so you can restore it.",
  quality: "Quality",
  smallerFile: "Smaller file",
  higherQuality: "Higher quality",
  qualityHint: "Lower values shrink the file more. Higher values keep more detail.",
  pngCompression: "Lossless compression",
  pngCompressionHint: "Higher levels use stronger, slower compression. PNG pixels remain unchanged.",
  faster: "Faster",
  optimizeSourceLabel: "File to optimize: {file}",
  bytesWord: "bytes",
  cropRotate: "Crop & rotate",
  resize: "Resize",
  convertFormat: "Convert format",
  removeBackground: "Remove background",
  replaceMedia: "Replace media",
  renameFile: "Rename file",
  newFilename: "New filename",
  checking: "Checking…",
  restoreOriginalTitle: "Restore original?",
  restoring: "Restoring…",
  restoreOriginal: "Restore original",
  deleteOriginalTitle: 'Delete original backup?',
  deleteOriginal: 'Delete original',
  optimizeAt: "Optimize at {quality}%?",
  optimizing: "Optimizing…",
  optimize: "Optimize",
  replaceMediaTitle: "Replace media?",
  replacing: "Replacing…",
  replace: "Replace",
  renameFileTitle: "Rename file?",
  renaming: "Renaming…",
  confirmRename: "Confirm rename",
  deleteMediaTitle: "Delete media?",
  changeFile: "Change file",
  chooseReplacement: "Choose replacement file",
  attachmentRecord: "Attachment record managed by WordPress.",
  fileSection: "File",
  fileSectionHint: "Technical details of the file stored on disk.",
  attachmentId: "Attachment ID",
  mimeType: "MIME type",
  extension: "Extension",
  megapixels: "Megapixels",
  pathLabel: "Path",
  onDisk: "On disk",
  yes: "Yes",
  missing: "Missing",
  uploaded: "Uploaded",
  modified: "Modified",
  editInWp: "Edit in WordPress",
  openAttachment: "Open attachment",
  aiAndIndex: "AI & index",
  duplicate: "Duplicate",
  usageCountLabel: "Usage count",
  perceptualHash: "Perceptual hash",
  exifCamera: "EXIF / camera",
  exifHint: "Camera and capture metadata embedded in the image.",
  generatedSizes: "Generated sizes",
  openSize: "Open {name}",
  apply: "Apply",
  applying: "Applying…",
  confirm: "Confirm",
  create: "Create",
  onlyResizeNote: "Only JPEG, PNG, GIF, and WebP images can be resized.",
  sizePresets: "Size presets",
  resizePresetsTitle: 'Resize presets',
  resizePresetsHint: 'Customize the quick sizes shown in the image resize tool. Width presets keep the image proportions; percentage presets use the original width.',
  presetLabel: 'Button label', presetType: 'Preset type', presetWidth: 'Maximum width', presetPercent: 'Percentage', presetPercentValue: 'Original width (%)', presetWidthValue: 'Width (px)', removePreset: 'Remove preset', remove: 'Remove', addPreset: 'Add preset', newPreset: 'Custom',
  width: "Width",
  height: "Height",
  unlockAspect: "Unlock aspect ratio",
  lockAspect: "Lock aspect ratio",
  resizeMaxHint: "The image cannot be larger than its original size ({w}×{h} px).",
  resizing: "Resizing…",
  resizeConfirm: "Resize this image? A backup of the original is kept.",
  resizeToSize: 'Resize to {size}',
  resizeToSizeQuestion: 'Resize to {size}?',
  onlyConvertNote: "Only JPEG, PNG, and WebP images can be converted.",
  targetFormat: "Target format",
  converting: "Converting…",
  convertTo: "Convert to {format}",
  convertQualityHint: "Quality applies to JPEG and WebP. PNG stays lossless.",
  onlyRemoveBgNote: "Only JPEG, PNG, and WebP images support background removal.",
  original: "Original",
  cutout: "Cutout",
  working: "Working…",
  noPreviewYet: "No preview yet",
  loadingModel: "Loading model…",
  downloadingModel: "Downloading model (first time only)…",
  removingBackground: "Removing background…",
  processing: "Processing…",
  regeneratePreview: "Regenerate preview",
  generatePreview: "Generate preview",
  applyBgRemoval: "Apply background removal?",
  applyBgBody: "The current file is replaced by a transparent PNG. A backup of the original is kept.",
  rotateAndCrop: "Rotate and crop",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  finishCropToRotate: "Finish the crop before rotating the preview",
  cropping: "Cropping",
  crop: "Crop",
  aspectRatio: "Aspect ratio",
  applyImageEdits: "Apply image edits?",
  applyEdits: "Apply edits",
  applyEditsBody: "Crop and rotation are written to the file. Thumbnails are regenerated. A backup is kept.",
  noPreview: "No preview",
  resetEdits: "Reset",
  comparingHashes: "Comparing hashes…",
  couldntLoadDuplicates: "Couldn’t load duplicates",
  loadingDuplicates: "Loading duplicates",
  scanLibrary: "Scan library",
  noDuplicateGroups: "No duplicate groups",
  runScanHint: "Run a scan to find duplicate files in the library.",
  duplicatesPagination: "Duplicates pagination",
  nearDuplicate: "Near duplicate",
  exactDuplicate: "Exact duplicate",
  healthScores: "Health scores",
  indexedLabel: "Indexed",
  aiAnalyzed: "AI analyzed",
  altCoverage: "ALT coverage",
  inUse: "In use",
  refreshing: "Refreshing…",
  allClear: "All clear",
  noIssues: "No issues flagged right now.",
  viewIssue: "View",
  issuesHeading: "Issues",
  indexIncomplete: "Library index incomplete",
  indexIncompleteBody: "{indexed} of {total} attachments are indexed. Run a full index before you rely on search, folders, and health.",
  indexing: "Indexing…",
  indexingTitle: "Indexing media library",
  indexWaitFinish: "Please wait until this finishes.",
  indexWaitAll: "Please wait until every attachment is indexed.",
  indexedOf: "Indexed {indexed} of {total} attachments.",
  unusedTitle: "Unused media",
  unusedHint: "{count} possibly unused. Never delete them without checking where they are used.",
  queueRescan: "Queue reference rescan",
  unusedEmpty: "No indexed items with zero usage right now.",
  pickerFolderEmpty: "This folder is empty. Try another folder or clear the filters.",
  pickerNoMatches: "No matches for the current filters.",
  noMediaFound: "No media found",
  checkSingular: "check",
  checksPlural: "checks",
  sysEnvironment: "Environment",
  sysExtensions: "PHP extensions and libraries",
  sysFilesystem: "Filesystem and permissions",
  sysDatabase: "Plugin database",
  sysJobs: "Background jobs",
  sysCapabilities: "WordPress capabilities",
  sysAi: "AI providers (BYOK)",
  sysIndex: "Media index",
  sysPhpVersion: "PHP version",
  sysWpVersion: "WordPress version",
  sysDbVersion: "Database server",
  sysMemory: "PHP memory limit",
  sysMaxUpload: "Max upload size",
  sysMultisite: "Multisite",
  sysImageLib: "Image library (GD / Imagick)",
  sysWebp: "WebP support",
  sysAvif: "AVIF support",
  sysUploadsDir: "Uploads directory",
  sysPluginPath: "Plugin path readable",
  sysDbTables: "Library tables",
  sysSchema: "Schema version",
  sysActionScheduler: "Action Scheduler",
  sysWpCron: "WP-Cron",
  sysCronHook: "Plugin cron hook",
  sysCaps: "Plugin capabilities registered",
  sysAiDefault: "Default AI provider",
  sysMediaCount: "WordPress attachments",
  sysIndexCoverage: "Index coverage",
  issueOrphan: "Stale index rows",
  issueOrphanHint: "Index entries for deleted or trashed attachments. Run Index library to clean them up.",
  issueUnused: "Possibly unused media",
  issueUnusedHint: "Open Unused and rescan references before you delete anything.",
  issueDup: "Exact duplicate groups",
  issueDupHint: "Review Duplicates and keep the best file in each group.",
  issueAlt: "Images missing ALT text",
  issueAltHint: "Generate ALT text in the inspector, then save.",
  issueAiFailed: "Failed AI analyses",
  issueAiFailedHint: "Check the API key in Settings and try the analysis again.",
  issueLarge: "Files larger than {mb} MB",
  issueLargeHint: "Consider optimizing oversized uploads.",
  issueMissingFiles: "Broken attachment files (sample)",
  issueMissingFilesHint: "These attachment records point to files missing from disk.",
  issueUnindexed: "Attachments not yet indexed",
  issueUnindexedHint: "Run Index library from the library toolbar.",
  aiPowered: "AI powered",
  standard: "Standard",
  freeTier: "Free",
  enableFeature: "Enable {name}",
  modelLabel: "Model",
  analyzedAt: "Analyzed",
  openInBuilder: "Open in {name}",
  replaceHint: "The attachment ID stays the same. References keep working.",
  renameHint: "The filename changes on disk and matching URLs on the site are updated.",
  deleteMediaBody: "The file is removed from the media library. This cannot be undone.",
  restoreBody: "The backup replaces the current file and thumbnails are regenerated.",
  deleteOriginalBody: 'This permanently deletes the saved original backup. The current image remains, but it can no longer be restored to that original.',
  optimizeBody: "The image is re-encoded at {quality}% quality. You can restore the original afterward.",
  renameBody: "Site URLs that point at this file are updated to the new name.",
  renameReferencesHint: "Known references: {count}. Hard-coded URLs in content will also be rewritten where found.",
  replaceBody: "The new file replaces the current one. The attachment ID does not change.",
  featUploadLabel: "Upload",
  featUploadDesc: "Upload new media from the library toolbar.",
  featFoldersLabel: "Virtual folders",
  featFoldersDesc: "Organize media into virtual folders without moving files on disk.",
  featFiltersLabel: "Advanced filters",
  featFiltersDesc: "Filter by file type, AI status, unused, missing ALT, large files, orientation, date, and author.",
  featBulkLabel: "Bulk actions",
  featBulkDesc: "Select several items to add them to a folder or delete them.",
  featModalLabel: "Media modal picker",
  featModalDesc: "Folders and search inside the WordPress media window.",
  featSmartLabel: "Smart views",
  featSmartDesc: "Save, rename, update, and delete filter shortcuts in the sidebar.",
  featAnalysisLabel: "AI image analysis",
  featAnalysisDesc: "Vision analysis that writes a description and tags. Uses your own API key.",
  featMetaLabel: "AI metadata",
  featMetaDesc: "Generate title, ALT text, caption, and description with AI.",
  featBulkAltLabel: "Bulk ALT",
  featBulkAltDesc: "Generate and apply ALT text for several items, with progress and a final recap.",
  featMultiLabel: "Multilingual metadata",
  featMultiDesc: "Separate metadata fields for each language in the inspector.",
  featDupLabel: "Duplicate detection",
  featDupDesc: "Find identical and near-duplicate files in the library.",
  featUnusedLabel: "Unused media",
  featUnusedDesc: "Find attachments with no known references.",
  featUsageLabel: "Usage",
  featUsageDesc: "Scan where media is used in posts, custom fields, and page builders.",
  featHealthLabel: "Health",
  featHealthDesc: "Library scores and a list of issues.",
  featSystemLabel: "System status",
  featSystemDesc: "Environment checks, PHP limits, and plugin diagnostics.",
  featOptimizeLabel: "Image optimization",
  featOptimizeDesc: "Compress images, preview the result, and restore from a backup.",
  featEditLabel: "Crop and rotate",
  featEditDesc: "Crop and rotate without losing the original. Thumbnails are regenerated.",
  featResizeLabel: "Resize",
  featResizeDesc: "Resize an image to an exact width and height. A backup is kept.",
  featConvertLabel: "Format conversion",
  featConvertDesc: "Convert between JPEG, PNG, WebP, and AVIF when the server supports it.",
  featRmbgLabel: "Remove background",
  featRmbgDesc: "Remove the background in the browser and save a transparent PNG.",
  featReplaceLabel: "Replace file",
  featReplaceDesc: "Replace the file while keeping the same attachment ID and references.",
  featRenameLabel: "Rename file",
  featRenameDesc: "Rename the file on disk, regenerate sizes, and update URLs across the site.",
  featAiRenameLabel: "AI rename on upload",
  featAiRenameDesc: "After analysis, offer a descriptive filename and update references. You confirm before it is applied.",
  featWhiteLabelLabel: "White label",
  featWhiteLabelDesc: "Replace the plugin logo and the WordPress admin menu icon with your own.",
  whiteLabelTitle: "White label",
  whiteLabelHint: "Your logo appears in the library. The icon replaces the WordPress admin menu icon. PNG, JPEG, WebP, or GIF, up to 2 MB.",
  whiteLabelLogo: "Company logo",
  whiteLabelLogoHint: "Replaces the logo in the library sidebar.",
  whiteLabelIcon: "Menu icon",
  whiteLabelIconHint: "Replaces the icon in the WordPress admin menu. A square image works best.",
  whiteLabelUpload: "Upload",
  whiteLabelReplace: "Replace",
  whiteLabelRemove: "Remove",
  whiteLabelSaved: "Brand image saved.",
  whiteLabelRemoved: "Brand image removed.",
  whiteLabelUploadFailed: "Could not save the brand image.",
  whiteLabelFileType: "Choose a PNG, JPEG, WebP, or GIF image.",
  whiteLabelTooLarge: "The image is too large. Maximum size is 2 MB.",
  rangeOf: "{from}–{to} of {total}",
  pageOf: "Page {current} of {total}",
  ringAttachments: "{n} of {m} attachments",
  ringIndexed: "{n} of {m} indexed",
  ringUnused: "{n} possibly unused",
  ringMissingAlt: "{n} of {m} images missing ALT",
  ringChecks: "{n} of {m} checks passed",
  inspectorHeading: "Inspector",
  inspectorEmpty: "Select a file to edit its metadata, AI info, and usage.",
  loadingFileDetails: "Loading file details…",
  foldersVirtualHint: "Virtual folders only. Files stay in the WordPress uploads directory.",
  optimizeButton: "Optimize at {quality}%",
  cropToolHint: "Adjust the frame and orientation. Applied changes regenerate thumbnails and keep a backup.",
  resizeCurrent: "Current size: {w}×{h} px.",
  convertConfirm: "Convert this image to {format}?",
  convertReferencesNotice: 'FoldRocket will update recognized file URLs in posts, metadata and options. Custom or external references may still need review.',
  removeBgRuns: "Runs in your browser, without an API key. The first run downloads a local model. Applying saves a transparent PNG and keeps a backup.",
  cropRotateHint: "Rotate in 90° steps, or crop the frame. The preview updates before you apply.",
  missingAttachment: "Missing attachment.",
  wpSection: "WordPress",
  usesCount: "{count} uses",
  perPageHint: "Number of media items shown on each library page. Between 1 and 100 (default 20).",
  largeFileSettingsHint: "Files at or above this size are flagged as large in Library filters and Health (default 2 MB).",
  accentHint: "Accent used for buttons, selection rings, and active states across the library UI.",
  textGenHint: "Optional guidance for titles, ALT text, captions, and descriptions. Used when you analyze or generate with AI.",
  modelHint: "Vision model for descriptions, titles, ALT text, and captions.",
  providerUsedFor: "Used for Analyze with AI and Generate with AI. Bring your own key.",
  configuredSuffix: "(configured)",
  savedSuffix: "(saved)",
  keepKeyPlaceholder: "Leave blank to keep the current key",
  retry: "Retry",
  relaunchShort: "You’ll go through setup again. Current settings stay until you finish.",
  modalSearchHint: "The WordPress media window includes FoldRocket search when you insert media.",
  severityWarn: "Warning",
  severityInfo: "Info",
  severityError: "Error",
  deleteMedia: "Delete media",
  assignFolderHint: "Assign this media item to an existing folder without moving the file on disk.",
  renameExtHint: "Extension stays the same. Confirm before the file is renamed on disk.",
  renameMissingExtHint: "The physical file is missing. Enter the extension of the existing file in this folder to reconnect it.",
  resizeToolDesc: "A backup of the original is kept.",
  convertToolDesc: "Convert between JPEG, PNG and WebP. The attachment ID stays the same and a backup is kept.",
  removeBgToolDesc: "Generate a cutout preview in your browser, then apply a transparent PNG. A backup of the original is kept.",
  aiIndexHint: "Analysis status and hashes stored by FoldRocket.",
  generatedSizesHint: "Intermediate image sizes WordPress generated for this attachment.",
  noExif: "No EXIF metadata found for this file.",
  noExifFormat: "No EXIF metadata found for this file (this format typically has little or no EXIF).",
  cropRatioHint: "Lock the crop box to a ratio, or choose Free to drag freely.",
  cropAfterRotate: "Crop is framed on the original orientation; rotation is applied after.",
  usesCountOne: "{count} use",
  statusUnknown: "Unknown",
  statusNone: "None",
  dupUnique: "Unique",
  dupExact: "Exact duplicate",
  dupNear: "Near duplicate",
  optOptimized: "Optimized",
  optSkipped: "Skipped",
  optFailed: "Failed",
  confHigh: "High",
  confMedium: "Medium",
  confLow: "Low",
  confUnknown: "Unknown",
  aspectFree: "Free",
  sessionExpired: "Session expired. Reload the page and log in again.",
  requestFailed: "Request failed",
  requestFailedHtml: "Request failed (HTTP {status}). The server returned HTML instead of JSON.",
  requestFailedHttp: "Request failed (HTTP {status}).",
  aiQueueFailed: "Could not queue AI generation. Try again.",
  jobRunnerTimeout: "Job runner timed out.",
  altPreviewTimeout: "ALT preview timed out. Try fewer items or check your AI provider.",
  uploadNetworkError: "Network error while uploading. Check your connection and try again.",
  optimizePreviewTimeout: "Optimize preview timed out. Try again.",
  optimizeTimeout: "Optimization timed out. Try again or use a smaller image.",
  restoreTimeout: "Restore timed out. Try again or check the server.",
  removeBgNetworkError: "Network error while removing the background. Check your connection and try again.",
  replaceNetworkError: "Network error while replacing the file. Check your connection and try again.",
  suggestNameFailed: "Could not suggest a filename. Try again.",
  providerTestTimeout: "Provider test timed out. Check your network and API key.",
  licenseTimeout: "License verification timed out. Try again.",
  bgLibLoadFailed: "Background removal library failed to load.",
  uploadItemFailed: "failed",
  mediaTabPlaceholder: "FoldRocket",
  contextMenuLabel: "Actions for {name}",
  openDetails: "Open details",
  copyFilename: "Copy filename",
  toastFilenameCopied: "Filename copied to clipboard.",
  toastFilenameCopyFailed: "Couldn't copy the filename.",
};

const it: Catalog = {
  ...aiEditMessagesIt,
  ...videoMessagesIt,
  providerModelSearch: "Cerca modelli…",
  providerModelCustom: "ID modello personalizzato",

  providerModelsHint: "Scegli un modello o inserisci il suo ID API. Richiede immagini in ingresso e output JSON. Salva la chiave API prima di aggiornare.",
  providerModelsRefresh: "Aggiorna modelli",
  providerModelsFallback: "{count} modelli nel catalogo integrato. La disponibilità dipende dal tuo account provider.",
  providerModelsLive: "{count} modelli compatibili dal catalogo del provider.",

  bulkAiChooseFields: "Scegli quali campi aggiornare per {count} media selezionati, nelle lingue abilitate. I campi non selezionati resteranno invariati.",
  bulkAiFilename: "Nome del file",
  bulkFolderConfirmTitle: "Conferma assegnazione alla cartella",
  bulkFolderConfirmBody: "Aggiungere {count} media selezionati alla cartella «{folder}»? I file restano in uploads.",

  generateAllConfirmBody: "Questa operazione sostituirà titolo, testo ALT, didascalia e descrizione nelle lingue scelte qui sotto.",
  generateAllRenameFilename: "Rigenera anche il nome del file",
  generateAllRenameUnavailable: "Abilita Rinomina file nelle Funzionalità per rigenerare il nome del file.",
  translateOtherLanguagesBody: "La lingua corrente è {language}. Scegli se generare solo questa lingua o tradurre anche nelle altre.",
  translateOtherLanguagesOption: "Traduci anche nelle altre lingue abilitate",

  used: "Usati",
  orderBy: "Ordina per",
  orderDefault: "Ordine predefinito",
  orderNewest: "Più recenti",
  orderOldest: "Meno recenti",
  orderTitleAsc: "Titolo A–Z",
  orderTitleDesc: "Titolo Z–A",
  orderLargest: "Più pesanti",
  orderSmallest: "Più leggeri",
  orderMostUsed: "Più utilizzati",
  orderLeastUsed: "Meno utilizzati",
  scanQueuedBackground: "Scansione in coda. Prosegue in background.",
  scanBackgroundProgress: "{label}: {current} di {total} media · {percent}%. Puoi lasciare questa pagina.",
  scanComparingProgress: "Confronto immagini · {percent}%. Puoi lasciare questa pagina.",
  scanComparingTitle: "Confronto immagini",
  scanBackgroundHint: "Prosegue in sicurezza in background",
  scanProgressCount: "{current} di {total} media elaborati",
  scanFailedBackground: "Scansione interrotta. Puoi riprendere dall’ultimo blocco salvato.",
  scanInterruptedTitle: "Scansione interrotta",
  scanInterruptedBody: "I progressi sono salvati. Puoi riprendere dall’ultimo blocco completato quando vuoi.",
  resumeScan: "Riprendi scansione",
  scanCompleteBackground: "Scansione completata.",
  unusedScanNeeded: "Esegui una scansione completa degli utilizzi prima della revisione. I file mai analizzati sono esclusi.",
  unusedSafetyWarning: "L’assenza di riferimenti indicizzati non garantisce che il file sia inutilizzato. Verifica ogni file e conserva un backup prima di eliminare.",
  groupPreviewLimited: "Mostrati {shown} di {total} file del gruppo.",
  unusedPagination: "Pagine media inutilizzati",

  title: 'FoldRocket',
  library: 'Libreria',
  duplicates: 'Duplicati',
  health: 'Salute',
  system: 'Sistema',
  settings: 'Impostazioni',
  features: 'Funzionalità',
  search: 'Cerca media…',
  newFolder: 'Nuova cartella',
  newSubfolder: 'Aggiungi sottocartella',
  newSubfolderTitle: 'Nuova sottocartella in {name}',
  downloadZip: 'Scarica zip',
  downloadZipBusy: 'Preparazione dello zip…',
  downloadZipEmpty: 'Nessun file da scaricare in questa vista.',
  downloadZipTooMany: 'Troppi file in questa vista per un unico zip.',
  downloadZipFailed: 'Impossibile creare lo zip.',
  folderColor: 'Scegli colore',
  folderColorRemove: 'Rimuovi colore',
  moveFolder: 'Sposta',
  moveFolderTo: 'Sposta in',
  moveFolderRoot: 'Primo livello',
  reorderBefore: 'Sposta prima dell’elemento precedente',
  reorderAfter: 'Sposta dopo l’elemento successivo',
  reorderStart: 'Sposta all’inizio',
  reorderEnd: 'Sposta alla fine',
  reorderMoved: '{name} spostato in posizione {position}.',
  smartViews: 'Viste intelligenti',
  smartViewAll: 'Tutti',
  smartViewUnused: 'Media non usati',
  smartViewMissingAlt: 'ALT mancante',
  smartViewLargeFiles: 'File grandi (>{mb} MB)',
  smartViewUnanalyzed: 'Non analizzati',
  foldersNav: 'Cartelle',
  smartViewSave: 'Salva',
  smartViewSaveCurrent: 'Salva i filtri attuali come vista intelligente',
  smartViewSaveNeedFilters: 'Imposta almeno un filtro prima',
  smartViewSaveTitle: 'Salva vista intelligente',
  smartViewName: 'Nome',
  smartViewNamePlaceholder: 'es. JPEG campagna, AI in sospeso',
  smartViewRename: 'Rinomina',
  smartViewUpdateFilters: 'Aggiorna filtri',
  smartViewUpdateTitle: 'Aggiornare i filtri della vista intelligente?',
  smartViewUpdateBody: 'Sostituisci i filtri di “{name}” con quelli attualmente attivi in libreria.',
  smartViewDelete: 'Elimina',
  smartViewDeleteBody: 'Eliminare la vista intelligente “{name}”? I file media non vengono cancellati.',
  smartViewsEmpty: 'Nessuna vista intelligente personalizzata. Applica dei filtri, poi salva una vista.',
  toastSmartViewCreated: 'Vista intelligente salvata.',
  toastSmartViewCreateFailed: 'Impossibile salvare la vista intelligente.',
  toastSmartViewRenamed: 'Vista intelligente rinominata.',
  toastSmartViewRenameFailed: 'Impossibile rinominare la vista intelligente.',
  toastSmartViewUpdated: 'Filtri della vista intelligente aggiornati.',
  toastSmartViewUpdateFailed: 'Impossibile aggiornare la vista intelligente.',
  toastSmartViewDeleted: 'Vista intelligente eliminata.',
  toastSmartViewDeleteFailed: 'Impossibile eliminare la vista intelligente.',
  upload: 'Carica',
  uploading: 'Caricamento…',
  analyze: 'Analizza con AI',
  generateWithAi: 'Genera con AI',
  generateAllData: 'Genera tutti i dati con l’AI',
  empty: 'Nessun media trovato.',
  loading: 'Caricamento…',
  error: 'Qualcosa è andato storto.',
  main: 'Principale',
  refresh: 'Aggiorna',
  refreshed: 'Libreria aggiornata.',
  resyncQueued: '{count} elementi in coda per l’indicizzazione.',
  pageLibraryTitle: 'Libreria media',
  pageLibrarySubtitle: 'Organizza, arricchisci e pulisci i media del tuo sito WordPress.',
  pageDuplicatesTitle: 'Duplicati',
  pageDuplicatesSubtitle: 'Trova file duplicati nella libreria. Nulla viene eliminato automaticamente.',
  pageHealthTitle: 'Salute',
  pageHealthSubtitle: 'Stato della libreria, problemi e opportunità di ottimizzazione.',
  pageSystemTitle: 'Sistema',
  pageSystemSubtitle: 'Verifica librerie PHP, capability WordPress e requisiti di runtime.',
  pageSettingsTitle: 'Impostazioni',
  pageSettingsSubtitle: 'Provider, lingue, aspetto, privacy e manutenzione.',
  pageFeaturesTitle: 'Funzionalità',
  pageFeaturesSubtitle:
    'Attiva o disattiva i moduli del prodotto. Le funzionalità high powered usano più risorse o crediti AI.',
  languagesTitle: 'Lingue',
  languagesDescription: 'Locali per i metadati multilingua.',
  toolLanguage: 'Lingua del tool',
  toolLanguageHint: 'Lingua dell’interfaccia di amministrazione di FoldRocket.',
  defaultLanguage: 'Lingua metadati predefinita',
  defaultLanguageHint: 'Usata come locale principale nell’inspector e in generazione metadati.',
  enabledLanguages: 'Lingue metadati abilitate',
  enabledLanguagesHint:
    'Solo le lingue abilitate compaiono nel selettore dell’inspector. Quella predefinita non si può disattivare.',
  defaultLocked: 'predefinita',
  settingsSaved: 'Impostazioni salvate.',
  followWordPress: 'Come WordPress',
  theme: 'Tema',
  themeLight: 'Chiaro',
  themeDark: 'Scuro',
  themeSystem: 'Sistema',
  themeHint: 'Chiaro, scuro o come il sistema operativo.',
  mediaTabLabel: 'Nome',
  mediaTabLabelHint:
    'Rinomina il tab nella finestra media di WordPress e la voce FoldRocket nel menu a sinistra. Il menu si aggiorna mentre scrivi. Lascia vuoto per i nomi predefiniti.',
  tabAppearance: 'Aspetto',
  tabConfiguration: 'Configurazione',
  configurationDesc: 'Configura i preset di ridimensionamento e la palette predefinita dei colori delle cartelle.',
  folderPaletteTitle: 'Palette colori cartelle',
  folderPaletteHint: 'Scegli i colori disponibili quando assegni un colore a una cartella.',
  paletteColor: 'Colore palette {index}',
  removePaletteColor: 'Rimuovi colore dalla palette',
  addPaletteColor: 'Aggiungi colore',
  tabLanguages: 'Lingue',
  tabAi: 'Provider AI',
  tabPrivacy: 'Privacy',
  tabMaintenance: 'Manutenzione',
  tabImport: 'Importa',
  importFoldersLead: 'Copia le cartelle da un altro plugin. I file restano dove sono.',
  importHappyFilesMissing: 'Nessuna cartella HappyFiles trovata.',
  importHappyFilesSummary: '{folders} cartelle e {files} file.',
  importHappyFilesAction: 'Importa',
  importHappyFilesWorking: 'Importazione…',
  importHappyFilesDone: 'Le cartelle HappyFiles sono nella libreria.',
  importHappyFilesDisabled: 'Attiva Importa cartelle in Funzionalità per usare questa sezione.',
  importRealMediaMissing: 'Nessuna cartella Real Media Library trovata.',
  importRealMediaAction: 'Importa',
  importRealMediaDone: 'Le cartelle Real Media Library sono nella libreria.',
  importFileBirdMissing: 'Nessuna cartella FileBird trovata.',
  importFileBirdAction: 'Importa',
  importFileBirdDone: 'Le cartelle FileBird sono nella libreria.',
  importWpMediaFolderMissing: 'Nessuna cartella WP Media Folder trovata.',
  importWpMediaFolderAction: 'Importa',
  importWpMediaFolderDone: 'Le cartelle WP Media Folder sono nella libreria.',
  tabLicense: 'Licenza',
  licenseTitle: 'Licenza',
  licenseDescription:
    'Sblocca le funzioni Pro (AI, analisi, strumenti immagine) con una chiave di licenza FoldRocket. L’edizione gratuita funziona senza chiave. Gestisci i piani su foldrocket.com.',
  licenseLockedDescription:
    'Questa demo include Pro per tutta la sessione. La licenza non si può modificare né disattivare.',
  licenseKey: 'Chiave di licenza',
  licenseKeyHint: 'Formato: FRKT-XXXX-XXXX-XXXX-XXXX — inviata via email dopo l’acquisto.',
  licenseActivate: 'Attiva',
  licenseDeactivate: 'Disattiva',
  licenseActivating: 'Verifica in corso…',
  licenseStatusActive: 'Licenza attiva',
  licenseStatusInactive: 'Non attivata',
  licenseStatusInvalid: 'Licenza non valida o scaduta',
  licenseWhereCode: 'Gestisci licenza / download',
  licenseBuyCta: 'Acquista Pro',
  licenseDomain: 'Dominio',
  licensePlan: 'Piano',
  licenseExpires: 'Scade',
  licenseSites: 'Siti',
  licenseBannerTitle: 'Sblocca Pro',
  licenseGateBody:
    'Stai usando l’edizione gratuita. Inserisci una chiave di licenza per sbloccare AI, insights e strumenti immagine.',
  licenseBannerCta: 'Apri impostazioni Licenza',
  licenseUnlockPro: 'Sblocca Pro',
  freeBannerTitle: 'Edizione gratuita',
  freeBannerBody:
    'Libreria, cartelle, filtri e caricamento sono disponibili. Sblocca Pro per AI, duplicati, salute e strumenti immagine.',
  freeBannerDismiss: 'Chiudi',
  proUpgradeTitle: 'FoldRocket Pro',
  proUpgradeBody:
    'Analisi AI, metadati, duplicati, salute e strumenti immagine sono nella versione Pro.',
  freeEditionTag: 'Edizione gratuita',
  proFeatureLocked: 'Richiede Pro — attiva una licenza per sbloccare.',
  featuresFreeNote:
    'Stai usando l’edizione gratuita. I moduli Pro restano bloccati finché non attivi una licenza.',
  featuresLoading: 'Caricamento…',
  featuresLoadFailed: 'Impossibile caricare le funzionalità',
  featuresIntro:
    'Attiva o disattiva ogni modulo del prodotto. Le funzionalità con AI usano i servizi che hai configurato (BYOK).',
  featuresAiNote: ' = analisi visiva, metadati o comandi che chiamano un servizio AI.',
  featuresProNote: ' = richiede una licenza attiva.',
  featuresColFeature: 'Funzionalità',
  featuresColType: 'Tipo',
  featuresColStatus: 'Stato',
  catLibrary: 'Libreria',
  catSearch: 'Ricerca',
  catAi: 'AI',
  catInsights: 'Approfondimenti',
  catTools: 'Strumenti',
  catIntegrations: 'Integrazioni',
  catSystem: 'Sistema',
  privacyTitle: 'Privacy con AI',
  privacyDescription:
    'Per impostazione predefinita tutto resta sul sito. Queste opzioni valgono quando invii immagini a un servizio AI con la tua chiave.',
  privacyStripExif: 'Rimuovi EXIF prima dell’invio all’AI',
  privacyStripExifDesc:
    'Rimuove i metadati EXIF (fotocamera, GPS e altro) dall’immagine prima che arrivi al servizio AI.',
  privacySendReduced: 'Invia solo anteprime ridotte',
  privacySendReducedDesc:
    'Per l’analisi invia un’anteprima ridotta invece del file completo, riducendo banda e dati in uscita.',
  privacyNeverOriginals: 'Non inviare mai i file originali a piena risoluzione',
  privacyNeverOriginalsDesc:
    'Impedisce l’invio del file originale a qualsiasi servizio AI, anche se l’anteprima ridotta non è disponibile.',
  uninstallDataLabel: 'Dati alla disinstallazione',
  uninstallKeep: 'Mantieni i dati del plugin',
  uninstallDelete: 'Elimina i dati del plugin alla disinstallazione',
  uninstallHint: 'I file media di WordPress non vengono mai rimossi da questo plugin.',
  relaunchWizard: 'Riapri la configurazione',
  relaunchWizardHint:
    'Esegui di nuovo la configurazione iniziale. Le impostazioni restano finché non la completi e salvi.',
  relaunchWizardConfirmTitle: 'Riaprire la configurazione guidata?',
  relaunchWizardConfirmBody:
    'Ripasserai i passaggi (lingue, aspetto, privacy, AI). Le impostazioni attuali restano finché non completi la configurazione.',
  save: 'Salva',
  saving: 'Salvataggio…',
  cancel: 'Annulla',
  systemPass: 'OK',
  systemWarn: 'Attenzione',
  systemFail: 'Errore',
  systemInfo: 'Info',
  systemAllGood: 'Tutti i controlli obbligatori sono ok',
  systemNeedsAttention: 'Alcuni controlli obbligatori non sono passati',
  systemSummary: '{pass} ok · {warn} avvisi · {fail} errori',
  systemCheck: 'Controllo',
  systemValue: 'Attuale',
  systemIdeal: 'Ideale',
  systemStatus: 'Stato',
  systemGroupOk: 'Tutto ok',
  systemGroupWarn: 'Avvisi',
  systemGroupFail: 'Problemi',
  systemRequiredNote: '* Obbligatorio per il funzionamento completo. I provider AI sono opzionali (BYOK).',
  toastChangesSaved: 'Modifiche salvate.',
  toastChangesSaveFailed: 'Impossibile salvare le modifiche. Riprova.',
  toastOptimized: 'Immagine ottimizzata — risparmiati {bytes} byte al {quality}%.',
  toastOptimizeSkipped: 'Ottimizzazione non disponibile per questo file.',
  toastOptimizeFailed: 'Impossibile ottimizzare questa immagine.',
  toastRestored: 'Immagine originale ripristinata.',
  toastOriginalDeleted: 'Copia originale eliminata definitivamente.',
  toastOriginalDeleteFailed: 'Impossibile eliminare la copia originale.',
  toastRestoreFailed: 'Impossibile ripristinare l’originale.',
  toastReplaced: 'File sostituito. L’ID dell’allegato è invariato.',
  toastReplaceFailed: 'Impossibile sostituire questo file.',
  toastRenamed: 'File rinominato. URL aggiornati nel sito.',
  toastRenameFailed: 'Impossibile rinominare questo file.',
  toastRenameAiSuggested: 'Suggerimento AI pronto: controlla il nome e conferma la rinomina.',
  toastRenameAiFailed: 'Impossibile suggerire un nome file. Controlla il provider AI.',
  toastAiAllSaved: 'Metadati AI salvati.',
  toastAiFieldSaved: '{field} aggiornato.',
  toastAiFailed: 'Generazione AI non riuscita. Controlla le impostazioni del provider.',
  toastAiNoApiKey: 'Nessuna API key AI configurata. Aggiungine una in Impostazioni → Provider AI.',
  toastAiCancelled: 'Generazione AI annullata.',
  toastAiQueued: 'Generazione AI avviata. I campi si aggiorneranno al termine.',
  cancelAiGeneration: 'Annulla',
  inspectorPrev: 'Media precedente',
  inspectorNext: 'Media successivo',
  inspectorClose: 'Chiudi',
  toastUsageUpdated: 'Utilizzi aggiornati — {count} posizione/i trovate.',
  toastUsageFailed: 'Impossibile riesaminare gli utilizzi di questo file.',
  toastTrashed: 'File eliminato.',
  toastTrashFailed: 'Impossibile eliminare questo file.',
  toastUrlCopied: 'URL copiato negli appunti.',
  toastUrlCopyFailed: 'Impossibile copiare l’URL.',
  inspectorCopyUrl: 'Copia URL',
  inspectorDownload: 'Scarica',
  toastImageEdited: 'Immagine aggiornata. Miniature rigenerate.',
  toastImageEditFailed: 'Impossibile applicare ritaglio o rotazione.',
  toastResized: 'Ridimensionata a {size}.',
  toastResizeFailed: 'Impossibile ridimensionare questa immagine.',
  toastConverted: 'Convertito in {format}.',
  toastConvertedReferences: 'Convertito in {format}. Aggiornati {count} contenuti che usavano il vecchio URL del file.',
  toastConvertFailed: 'Impossibile convertire questa immagine.',
  toastBulkConvertMissing: 'Impossibile convertire {count} immagini perché il file sorgente è mancante.',
  toastBulkConvertPartial: 'Impossibile convertire {failed} immagini su {total}. I file originali sono rimasti invariati.',
  toastRemoveBgApplied: 'Sfondo rimosso. Salvato come PNG trasparente.',
  toastRemoveBgFailed: 'Impossibile rimuovere lo sfondo.',
  toastFolderCreated: 'Cartella creata.',
  toastFolderCreateFailed: 'Impossibile creare la cartella.',
  toastFolderRenamed: 'Cartella rinominata.',
  toastFolderRenameFailed: 'Impossibile rinominare la cartella.',
  toastFolderMoved: 'Cartella spostata.',
  toastFolderMoveFailed: 'Impossibile spostare la cartella.',
  toastFolderDeleted: 'Cartella eliminata. I file media sono stati conservati.',
  toastFolderDeletedWithMedia:
    'Cartella eliminata. {count} media scollegati — i file sono stati conservati.',
  toastFolderDeleteFailed: 'Impossibile eliminare la cartella.',
  toastAddedToFolder: 'Aggiunto alla cartella.',
  toastAddedToFolderMany: 'Aggiunti {count} elementi alla cartella.',
  toastFolderAssignFailed: 'Impossibile aggiungere i media a questa cartella.',
  toastRemovedFromFolder: 'Rimosso dalla cartella.',
  toastFolderUnassignFailed: 'Impossibile rimuovere i media da questa cartella.',
  toastFeaturesSaved: 'Funzionalità aggiornate.',
  toastFeaturesSaveFailed: 'Impossibile aggiornare le funzionalità.',
  toastUploadOk: '{count} file caricati.',
  toastUploadPartial: '{ok} caricati, {failed} non riusciti.',
  toastUploadFailed: 'Caricamento non riuscito. Riprova.',
  toastUploading: 'Caricamento {current}/{total}…',
  toastIndexQueued: '{count} allegati in coda per l’indicizzazione.',
  toastUsageRebuildDone: 'Indice utilizzi ricostruito per {count} allegati.',
  toastDuplicatesScanned:
    'Scansione duplicati completata — {hashed} analizzati, {groups} gruppi.',
  toastUnusedRescanQueued: '{count} elementi in coda per il riesame utilizzi.',
  toastUnusedRescanStarted: 'Riesame utilizzi in coda.',
  toastBulkAnalyzeQueued: 'Analisi AI completata per {count} elementi.',
  toastBulkUsageScanned: 'Utilizzi analizzati per {count} elementi.',
  toastBulkUsageQueued: 'Scansione utilizzi in coda per {count} elementi.',
  toastBulkTrashed: '{count} elementi eliminati.',
  toastBulkTrashPartial: '{trashed} eliminati. {skipped} saltati.',
  bulkAltAction: 'Genera ALT',
  bulkAltConfirmTitle: 'Generare il testo ALT?',
  bulkAltConfirmBody:
    'Genera e applica il testo ALT a {count} elementi selezionati. Le modifiche vengono scritte su WordPress man mano.',
  bulkAltConfirmNote: 'Usa il provider AI. Gli elementi già analizzati vengono riusati quando possibile.',
  bulkAltConfirmAction: 'Genera e applica ({count})',
  bulkAltGeneratingTitle: 'Generazione ALT…',
  bulkAltGenerating: 'Generazione e applicazione del testo ALT…',
  bulkAltProgressCount: '{current} / {total}',
  bulkAltRetry: 'Riprova',
  bulkAltColFile: 'File',
  bulkAltColResult: 'Esito',
  bulkAltColAlt: 'Testo ALT',
  bulkAltEmpty: '(vuoto)',
  bulkAltFailed: 'Generazione non riuscita',
  bulkAltTooMany: 'Seleziona al massimo {max} elementi per ALT in blocco.',
  bulkAltRecapTitle: 'Generazione ALT completata',
  bulkAltRecapSummary: '{applied} applicati · {failed} non riusciti · {skipped} saltati',
  bulkAltRecapDone: 'Chiudi',
  bulkAltRecapSkipped: 'Non applicato',
  bulkAltStatusApplied: 'Applicato',
  bulkAltStatusFailed: 'Fallito',
  bulkAltStatusSkipped: 'Saltato',
  toastBulkAltApplied: 'ALT applicato a {count} elementi.',
  toastBulkAltPreviewFailed: 'Impossibile generare il testo ALT.',
  toastBulkAltApplyFailed: 'Impossibile applicare il testo ALT.',
  toastCommandFailed: 'Comando non riuscito. Prova una frase diversa.',
  toastSettingsSaved: 'Impostazioni salvate.',
  toastGenericError: 'Qualcosa è andato storto. Riprova.',
  overviewIntroTitle: 'La libreria è pronta',
  overviewIntroBody:
    'I file restano nella cartella uploads. Cartelle, filtri e caricamento funzionano qui senza spostare nulla sul disco.',
  overviewFoldersTitle: 'Cartelle virtuali',
  overviewFoldersBody: 'Raggruppa i media in cartelle. I file restano dove WordPress li ha salvati.',
  overviewFiltersTitle: 'Ricerca e filtri',
  overviewFiltersBody: 'Trova i file per nome, tipo, data e altri dettagli.',
  overviewUploadTitle: 'Caricamento',
  overviewUploadBody: 'Aggiungi file da qui. Compaiono in libreria appena il caricamento finisce.',
  overviewGridTitle: 'Apri un file',
  overviewGridBody: 'Clicca un elemento per modificare titolo, testo ALT e didascalia.',
  overviewMediaTitle: 'Questo file',
  overviewMediaBody: 'Qui si modificano titolo, testo ALT e didascalia. Le modifiche si salvano da sole.',
  overviewSettingsTitle: 'Impostazioni',
  overviewSettingsBody: 'Cambia lingua, aspetto e opzioni della libreria scelte durante la configurazione.',
  overviewBack: 'Indietro',
  overviewNext: 'Avanti',
  overviewSkip: 'Salta',
  overviewDone: 'Fatto',
  overviewProgress: '{current} di {total}',
  allMedia: "Tutti i media",
  noFoldersYet: "Non ci sono ancora cartelle. Creane una per organizzare i file senza spostarli.",
  folderName: "Nome della cartella",
  folderNamePlaceholder: "es. Prodotti, Squadra, Campagne",
  createFolder: "Crea cartella",
  folderNameRequired: "Il nome della cartella è obbligatorio.",
  deleting: "Eliminazione…",
  deleteFolder: "Elimina cartella",
  deleteFolderTitle: "Eliminare “{name}”?",
  deleteUnlinkCount: "Elimina e scollega {count}",
  folderEmpty: "Questa cartella è vuota.",
  folderUnlinkBody: "{count} elementi verranno scollegati da questa cartella.",
  folderFilesStay: "I file restano in libreria. Nulla viene spostato o eliminato dal disco.",
  folderChildrenMove: "{count} sottocartelle saliranno di un livello.",
  chooseFolder: "Scegli una cartella…",
  destinationFolder: "Cartella di destinazione",
  addToFolder: "Aggiungi alla cartella",
  addAgain: "Aggiungi di nuovo",
  addingEllipsis: "Aggiunta…",
  addingToFolder: "Aggiunta alla cartella",
  assigningToFolder: "I media selezionati vengono aggiunti alla cartella scelta.",
  chooseFolderAndMedia: "Scegli una cartella e almeno un elemento.",
  loadingFolders: "Caricamento delle cartelle…",
  createFolderFirst: "Prima crea una cartella nella barra laterale.",
  notInAnyFolder: "Non è in nessuna cartella.",
  removeFromFolder: "Rimuovi dalla cartella",
  removeFromNamed: "Rimuovi da {name}",
  folderEmptyUpload: "Questa cartella è vuota. Carica dei file o spostali qui dalla libreria.",
  uploadToStart: "Carica dei file per iniziare. Verranno indicizzati automaticamente.",
  loadingLibrary: "Caricamento della libreria",
  couldntLoadMedia: "Impossibile caricare i media",
  noMediaYet: "Non ci sono ancora media",
  colType: "Tipo",
  colDimensions: "Dimensioni",
  colSize: "Dimensione",
  colStatus: "Stato",
  selectAllPage: "Seleziona tutto in questa pagina",
  pagination: "Paginazione",
  prevPage: "Pagina precedente",
  nextPage: "Pagina successiva",
  gridView: "Vista a griglia",
  listView: "Vista a elenco",
  viewMode: "Modalità di vista",
  previewSize: "Dimensione anteprima",
  previewSmall: "Anteprime piccole",
  previewMedium: "Anteprime medie",
  previewLarge: "Anteprime grandi",
  filtersLabel: "Filtri",
  altPresent: "Testo ALT presente",
  altMissing: "Testo ALT mancante",
  selectItem: "Seleziona {name}",
  idLabel: "ID {id}",
  dismiss: "Chiudi",
  clear: "Azzera",
  selectedWord: "selezionati",
  bulkActions: "Azioni di gruppo",
  analyzeAi: "Analizza con AI",
  analyzing: "Analisi…",
  inspectUsage: "Controlla l’utilizzo",
  deleteItemsTitle: "Eliminare {count} elementi in modo definitivo?",
  deletePermanently: "Elimina definitivamente",
  deleteImmediate: "I file vengono rimossi subito dalla libreria. L’operazione non si può annullare.",
  skipUsedItems: "Salta gli elementi già in uso",
  analyzingWithAi: "Analisi con AI",
  waitAnalyze: "Aspetta che tutti gli elementi selezionati siano analizzati.",
  inspectingUsage: "Controllo dell’utilizzo",
  scanningUsage: "Cerchiamo dove viene usato sul sito ogni elemento selezionato.",
  deletingMedia: "Eliminazione dei media",
  removingSelected: "Rimozione degli elementi selezionati dalla libreria.",
  uploadMedia: "Carica media",
  afterUpload: "Dopo il caricamento",
  dropFiles: "Rilascia i file per caricarli",
  changeFiles: "Cambia file",
  chooseFiles: "Scegli i file",
  noFilesSelected: "Nessun file selezionato",
  filesSelected: "{count} file selezionati",
  uploadWithCount: "Carica ({count})",
  uploadNoAsset: "Caricamento riuscito, ma non è stato restituito alcun file.",
  demoUploadReached: "Questa demo consente al massimo {max} caricamenti. Il limite è stato raggiunto.",
  demoUploadRemaining: "Questa demo consente al massimo {max} caricamenti ({remaining} rimanenti).",
  analyzeUploadDesc: "Genera descrizione, tag e metadati con il servizio di analisi visiva.",
  renameFileWithAi: "Rinomina il file con l’AI",
  renameFileWithAiDesc: "Scegli un nome file descrittivo e aggiorna gli URL corrispondenti sul sito. La rinomina va confermata.",
  fileType: "Tipo di file",
  typesCount: "{count} tipi",
  orientation: "Orientamento",
  landscape: "Orizzontale",
  portrait: "Verticale",
  square: "Quadrato",
  orientationsCount: "{count} orientamenti",
  author: "Autore",
  authorsCount: "{count} autori",
  userNumber: "Utente #{id}",
  uploadedFrom: "Caricato dal",
  uploadedTo: "Caricato fino al",
  aiStatus: "Stato AI",
  notAnalyzed: "Non analizzato",
  analyzed: "Analizzato",
  skipped: "Saltato",
  flags: "Contrassegni",
  flagsCount: "{count} contrassegni",
  missingAlt: "ALT mancante",
  missingFile: "File mancante",
  largeFiles: "File grandi",
  largeFilesOver: "File grandi (>{mb} MB)",
  unused: "Non usati",
  otherType: "Altro",
  appearanceDesc: "Come appare la libreria e quanti elementi caricare per pagina.",
  mediaPerPage: "Media per pagina",
  largeFileMb: "Soglia file grandi (MB)",
  primaryColor: "Colore primario",
  primaryColorPicker: "Selettore del colore primario",
  primaryColorHex: "Colore primario esadecimale",
  reset: "Reimposta",
  byokDesc: "Usa la tua chiave. Le chiavi sono cifrate sul server e non tornano mai al browser.",
  defaultProvider: "Provider predefinito",
  selectProvider: "Scegli un provider…",
  providerModel: "Modello {name}",
  providerApiKey: "Chiave API di {name}",
  chooseProviderHint: "Scegli un provider per impostare il modello e la chiave API.",
  textGenInstructions: "Istruzioni per la generazione del testo",
  textGenPlaceholder: "es. Scrivi il testo ALT in modo breve e adatto ai motori di ricerca. Evita i nomi dei marchi. Tieni le didascalie corte e fattuali.",
  hideApiKey: "Nascondi chiave API",
  showApiKey: "Mostra chiave API",
  testProvider: "Prova il provider",
  testing: "Prova in corso…",
  queuing: "In coda…",
  scanning: "Scansione…",
  indexLibrary: "Indicizza e analizza la libreria",
  indexLibraryDesc: "Aggiorna tutti gli allegati e ricostruisce dove ogni file è usato nei contenuti e nei builder supportati.",
  rebuildUsage: "Ricostruisci l’indice di utilizzo",
  rebuildUsageDesc: "Ricontrolla dove i media sono usati nei contenuti e nei costruttori.",
  indexToolsDesc: "Strumenti di indicizzazione in secondo piano. Puoi avviarli quando vuoi. Non viene eliminato nulla.",
  failedLoadSettings: "Impossibile caricare le impostazioni.",
  settingsSections: "Sezioni delle impostazioni",
  recommendedSuffix: "(consigliato)",
  providerKeyHint: "Chiave API di questo provider. È cifrata sul server.",
  setupInitial: "Configurazione iniziale",
  setupProgress: "Avanzamento della configurazione",
  wizardWelcome: "Benvenuto",
  wizardWelcomeBody: "Configuriamo FoldRocket per questo sito. Potrai cambiare tutto più tardi in Impostazioni e Funzionalità.",
  wizardBulletFolders: "Libreria media locale con cartelle virtuali",
  wizardBulletFree: "Filtri, caricamento e pannello del file",
  wizardBulletAi: "Analisi AI facoltativa con le tue chiavi API (BYOK)",
  wizardBulletPro: "Metadati multilingua, punteggi di salute e strumenti di ottimizzazione",
  metaLanguages: "Lingue dei metadati",
  metaLanguagesHint: "Scegli quali lingue attivare per titoli, didascalie e descrizioni.",
  defaultLanguageShort: "Lingua predefinita",
  popular: "Popolari",
  allLanguages: "Tutte le lingue ({count})",
  interfaceLanguage: "Lingua dell’interfaccia",
  appearanceHint: "Tema, colore di accento e lingua dell’interfaccia.",
  itemsPerPage: "Elementi per pagina",
  largeFileHintFree: "Usata dal filtro dei file grandi.",
  largeFileHintPro: "Usata dal filtro dei file grandi e dagli avvisi di salute.",
  libraryDefaults: "Predefiniti della libreria",
  libraryDefaultsHint: "Come si comporta la griglia della libreria.",
  defaultView: "Vista predefinita",
  grid: "Griglia",
  list: "Elenco",
  wizardPrivacyHint: "Tutto resta sul tuo sito, salvo quando invii le immagini a un provider AI.",
  wizardModelHint: "Scegli il modello che FoldRocket deve usare. Potrai cambiarlo in seguito nelle impostazioni AI.",
  aiProviderOptional: "Provider AI (facoltativo)",
  aiProviderOptionalHint: "Usa la tua chiave. Puoi saltare questo passaggio e aggiungere un provider più tardi in Impostazioni. La libreria funziona senza AI.",
  provider: "Provider",
  skipForNow: "Salta per ora",
  apiKey: "Chiave API",
  pasteYourKey: "Incolla la tua chiave",
  wizardReady: "Sei pronto",
  wizardReadyBody: "Salveremo le tue scelte e apriremo la libreria. Se questo sito ha già dei media, apri poi Salute per indicizzarli.",
  wizardReadyBodyFree: "Salveremo le tue scelte e apriremo la libreria.",
  summaryDefaultLanguage: "Lingua predefinita: {value}",
  summaryEnabledLanguages: "Lingue attive: {count}",
  summaryTheme: "Tema: {value}",
  summaryAi: "AI: {value}",
  notConfiguredYet: "Non ancora configurato",
  finishSetup: "Termina la configurazione",
  continue: "Continua",
  back: "Indietro",
  setupComplete: "Configurazione completata. Benvenuto in FoldRocket.",
  details: "Dettagli",
  tools: "Strumenti",
  info: "Info",
  closeInspector: "Chiudi ispettore",
  mediaInspector: "Pannello del file",
  inspectorSections: "Sezioni dell’ispettore",
  localeLabel: "Lingua",
  detailsHint: "Modifica i metadati per la lingua selezionata. Le modifiche si salvano da sole.",
  generating: "Generazione…",
  generatingAll: "Generazione di tutti i dati…",
  generatingWithAi: "Generazione con AI…",
  suggestingFilename: "Proposta di un nome file…",
  saved: "Salvato",
  saveFailed: "Impossibile salvare",
  titleField: "Titolo",
  titleHint: "Nome mostrato per questo file in libreria e nella pagina dell’allegato.",
  altText: "Testo ALT",
  altHint: "Testo letto dai lettori di schermo e usato dai motori di ricerca quando l’immagine non si vede.",
  caption: "Didascalia",
  shortDescription: "Descrizione breve",
  captionHint: "Testo facoltativo mostrato con l’immagine in articoli, gallerie e blocchi.",
  shortDescHint: "Breve riassunto mostrato con questo file negli articoli o nei contenuti incorporati.",
  description: "Descrizione",
  descriptionHint: "Testo più lungo su questo file. Usato nella pagina dell’allegato e come contesto per l’AI.",
  usageHeading: "Utilizzo ({count})",
  rescan: "Ricontrolla",
  usageHint: "Dove viene usato questo file. Riesegui la scansione dopo averlo inserito in una pagina.",
  usageHintShort: "Dove viene usato questo file.",
  noUsageYet: "Nessun utilizzo indicizzato. Ricontrolla dopo aver inserito l’immagine in una pagina.",
  noUsageShort: "Nessun utilizzo indicizzato.",
  foldersHeading: "Cartelle",
  optimizeHeading: "Ottimizzazione",
  optimizeDesc: "Ottimizza il file usato da WordPress per questo allegato. Viene conservata una copia per poterlo ripristinare.",
  quality: "Qualità",
  smallerFile: "File più piccolo",
  higherQuality: "Qualità più alta",
  qualityHint: "Valori più bassi riducono di più il file. Valori più alti tengono più dettaglio.",
  pngCompression: "Compressione senza perdita",
  pngCompressionHint: "I livelli più alti applicano una compressione più intensa e lenta. I pixel PNG restano invariati.",
  faster: "Più veloce",
  optimizeSourceLabel: "File da ottimizzare: {file}",
  bytesWord: "byte",
  cropRotate: "Ritaglia e ruota",
  resize: "Ridimensiona",
  convertFormat: "Converti formato",
  removeBackground: "Rimuovi sfondo",
  replaceMedia: "Sostituisci media",
  renameFile: "Rinomina file",
  newFilename: "Nuovo nome file",
  checking: "Controllo…",
  restoreOriginalTitle: "Ripristinare l’originale?",
  restoring: "Ripristino…",
  restoreOriginal: "Ripristina originale",
  deleteOriginalTitle: 'Eliminare la copia originale?',
  deleteOriginal: 'Elimina originale',
  optimizeAt: "Ottimizzare al {quality}%?",
  optimizing: "Ottimizzazione…",
  optimize: "Ottimizza",
  replaceMediaTitle: "Sostituire i media?",
  replacing: "Sostituzione…",
  replace: "Sostituisci",
  renameFileTitle: "Rinominare il file?",
  renaming: "Rinomina…",
  confirmRename: "Conferma rinomina",
  deleteMediaTitle: "Eliminare i media?",
  changeFile: "Cambia file",
  chooseReplacement: "Scegli il file sostitutivo",
  attachmentRecord: "Scheda allegato gestita da WordPress.",
  fileSection: "File",
  fileSectionHint: "Dettagli tecnici del file salvato sul disco.",
  attachmentId: "ID allegato",
  mimeType: "Tipo MIME",
  extension: "Estensione",
  megapixels: "Megapixel",
  pathLabel: "Percorso",
  onDisk: "Sul disco",
  yes: "Sì",
  missing: "Mancante",
  uploaded: "Caricato",
  modified: "Modificato",
  editInWp: "Modifica in WordPress",
  openAttachment: "Apri allegato",
  aiAndIndex: "AI e indice",
  duplicate: "Duplicato",
  usageCountLabel: "Numero di utilizzi",
  perceptualHash: "Impronta percettiva",
  exifCamera: "EXIF / fotocamera",
  exifHint: "Metadati di fotocamera e scatto salvati nell’immagine.",
  generatedSizes: "Dimensioni generate",
  openSize: "Apri {name}",
  apply: "Applica",
  applying: "Applicazione…",
  confirm: "Conferma",
  create: "Crea",
  onlyResizeNote: "Si possono ridimensionare solo immagini JPEG, PNG, GIF e WebP.",
  sizePresets: "Dimensioni predefinite",
  resizePresetsTitle: 'Preset di ridimensionamento',
  resizePresetsHint: 'Personalizza le dimensioni rapide mostrate nello strumento di ridimensionamento. I preset di larghezza mantengono le proporzioni; quelli percentuali usano la larghezza originale.',
  presetLabel: 'Etichetta pulsante', presetType: 'Tipo di preset', presetWidth: 'Larghezza massima', presetPercent: 'Percentuale', presetPercentValue: 'Larghezza originale (%)', presetWidthValue: 'Larghezza (px)', removePreset: 'Rimuovi preset', remove: 'Rimuovi', addPreset: 'Aggiungi preset', newPreset: 'Personalizzato',
  width: "Larghezza",
  height: "Altezza",
  unlockAspect: "Sblocca le proporzioni",
  lockAspect: "Blocca le proporzioni",
  resizeMaxHint: "L’immagine non può superare le dimensioni originali ({w}×{h} px).",
  resizing: "Ridimensionamento…",
  resizeConfirm: "Ridimensionare questa immagine? Resta una copia dell’originale.",
  resizeToSize: 'Ridimensiona a {size}',
  resizeToSizeQuestion: 'Ridimensionare a {size}?',
  onlyConvertNote: "Si possono convertire solo immagini JPEG, PNG e WebP.",
  targetFormat: "Formato di destinazione",
  converting: "Conversione…",
  convertTo: "Converti in {format}",
  convertQualityHint: "La qualità vale per JPEG e WebP. Il PNG resta senza perdita.",
  onlyRemoveBgNote: "Solo le immagini JPEG, PNG e WebP supportano la rimozione dello sfondo.",
  original: "Originale",
  cutout: "Ritaglio",
  working: "Elaborazione…",
  noPreviewYet: "Nessuna anteprima",
  loadingModel: "Caricamento del modello…",
  downloadingModel: "Scaricamento del modello (solo la prima volta)…",
  removingBackground: "Rimozione dello sfondo…",
  processing: "Elaborazione…",
  regeneratePreview: "Rigenera anteprima",
  generatePreview: "Genera anteprima",
  applyBgRemoval: "Applicare la rimozione dello sfondo?",
  applyBgBody: "Il file attuale viene sostituito da un PNG trasparente. Resta una copia dell’originale.",
  rotateAndCrop: "Ruota e ritaglia",
  rotateLeft: "Ruota a sinistra",
  rotateRight: "Ruota a destra",
  finishCropToRotate: "Termina il ritaglio prima di ruotare l’anteprima",
  cropping: "Ritaglio",
  crop: "Ritaglia",
  aspectRatio: "Proporzioni",
  applyImageEdits: "Applicare le modifiche all’immagine?",
  applyEdits: "Applica modifiche",
  applyEditsBody: "Ritaglio e rotazione vengono scritti nel file. Le miniature si rigenerano. Resta una copia.",
  noPreview: "Nessuna anteprima",
  resetEdits: "Reimposta",
  comparingHashes: "Confronto delle impronte…",
  couldntLoadDuplicates: "Impossibile caricare i duplicati",
  loadingDuplicates: "Caricamento dei duplicati",
  scanLibrary: "Analizza la libreria",
  noDuplicateGroups: "Nessun gruppo di duplicati",
  runScanHint: "Avvia un controllo per trovare i file duplicati nella libreria.",
  duplicatesPagination: "Paginazione dei duplicati",
  nearDuplicate: "Quasi duplicato",
  exactDuplicate: "Duplicato esatto",
  healthScores: "Punteggi di salute",
  indexedLabel: "Indicizzati",
  aiAnalyzed: "Analizzati con AI",
  altCoverage: "Copertura ALT",
  inUse: "In uso",
  refreshing: "Aggiornamento…",
  allClear: "Tutto a posto",
  noIssues: "Nessun problema segnalato in questo momento.",
  viewIssue: "Vedi",
  issuesHeading: "Problemi",
  indexIncomplete: "Indice della libreria incompleto",
  indexIncompleteBody: "Sono indicizzati {indexed} allegati su {total}. Esegui un’indicizzazione completa prima di usare ricerca, cartelle e salute.",
  indexing: "Indicizzazione…",
  indexingTitle: "Indicizzazione della libreria",
  indexWaitFinish: "Aspetta che finisca.",
  indexWaitAll: "Aspetta che ogni allegato sia indicizzato.",
  indexedOf: "Indicizzati {indexed} allegati su {total}.",
  unusedTitle: "Media non usati",
  unusedHint: "{count} forse non usati. Non eliminarli senza controllare dove sono usati.",
  queueRescan: "Metti in coda un nuovo controllo dei riferimenti",
  unusedEmpty: "Nessun elemento indicizzato con zero utilizzi, in questo momento.",
  pickerFolderEmpty: "Questa cartella è vuota. Prova un’altra cartella o azzera i filtri.",
  pickerNoMatches: "Nessun risultato con i filtri attuali.",
  noMediaFound: "Nessun media trovato",
  checkSingular: "controllo",
  checksPlural: "controlli",
  sysEnvironment: "Ambiente",
  sysExtensions: "Estensioni e librerie PHP",
  sysFilesystem: "File system e permessi",
  sysDatabase: "Database del plugin",
  sysJobs: "Lavori in secondo piano",
  sysCapabilities: "Permessi di WordPress",
  sysAi: "Provider AI (BYOK)",
  sysIndex: "Indice media",
  sysPhpVersion: "Versione PHP",
  sysWpVersion: "Versione di WordPress",
  sysDbVersion: "Server del database",
  sysMemory: "Limite di memoria PHP",
  sysMaxUpload: "Dimensione massima di caricamento",
  sysMultisite: "Multisito",
  sysImageLib: "Libreria grafica (GD / Imagick)",
  sysWebp: "Supporto WebP",
  sysAvif: "Supporto AVIF",
  sysUploadsDir: "Directory uploads",
  sysPluginPath: "Percorso del plugin leggibile",
  sysDbTables: "Tabelle della libreria",
  sysSchema: "Versione dello schema",
  sysActionScheduler: "Action Scheduler",
  sysWpCron: "WP-Cron",
  sysCronHook: "Attività pianificata del plugin",
  sysCaps: "Permessi del plugin registrati",
  sysAiDefault: "Provider AI predefinito",
  sysMediaCount: "Allegati di WordPress",
  sysIndexCoverage: "Copertura dell’indice",
  issueOrphan: "Righe di indice obsolete",
  issueOrphanHint: "Voci di indice per allegati eliminati o nel cestino. Avvia Indicizza la libreria per ripulirle.",
  issueUnused: "Media forse non usati",
  issueUnusedHint: "Apri Non usati e ricontrolla i riferimenti prima di eliminare qualcosa.",
  issueDup: "Gruppi di duplicati esatti",
  issueDupHint: "Controlla Duplicati e tieni il file migliore in ogni gruppo.",
  issueAlt: "Immagini senza testo ALT",
  issueAltHint: "Genera il testo ALT nell’ispettore, poi salva.",
  issueAiFailed: "Analisi AI non riuscite",
  issueAiFailedHint: "Controlla la chiave API in Impostazioni e riprova l’analisi.",
  issueLarge: "File più grandi di {mb} MB",
  issueLargeHint: "Valuta di ottimizzare i caricamenti troppo grandi.",
  issueMissingFiles: "File degli allegati mancanti (campione)",
  issueMissingFilesHint: "Questi allegati puntano a file che non sono più sul disco.",
  issueUnindexed: "Allegati non ancora indicizzati",
  issueUnindexedHint: "Avvia Indicizza la libreria dalla barra degli strumenti della libreria.",
  aiPowered: "Con AI",
  standard: "Standard",
  freeTier: "Gratis",
  enableFeature: "Attiva {name}",
  modelLabel: "Modello",
  analyzedAt: "Analizzato",
  openInBuilder: "Apri in {name}",
  replaceHint: "L’ID dell’allegato resta lo stesso. I riferimenti continuano a funzionare.",
  renameHint: "Il nome del file cambia sul disco e gli URL corrispondenti sul sito vengono aggiornati.",
  deleteMediaBody: "Il file viene rimosso dalla libreria. L’operazione non si può annullare.",
  restoreBody: "La copia di sicurezza sostituisce il file attuale e le miniature si rigenerano.",
  deleteOriginalBody: 'Questa azione elimina definitivamente la copia originale salvata. L’immagine attuale resta, ma non potrai più ripristinare quella copia.',
  optimizeBody: "L’immagine viene compressa al {quality}% di qualità. Poi puoi ripristinare l’originale.",
  renameBody: "Gli URL del sito che puntano a questo file vengono aggiornati al nuovo nome.",
  renameReferencesHint: "Riferimenti noti: {count}. Anche gli URL inseriti direttamente nei contenuti verranno riscritti quando individuati.",
  replaceBody: "Il nuovo file sostituisce quello attuale. L’ID dell’allegato non cambia.",
  featUploadLabel: "Carica",
  featUploadDesc: "Carica nuovi media dalla barra degli strumenti della libreria.",
  featFoldersLabel: "Cartelle virtuali",
  featFoldersDesc: "Organizza i media in cartelle virtuali senza spostare i file sul disco.",
  featFiltersLabel: "Filtri avanzati",
  featFiltersDesc: "Filtra per tipo di file, stato AI, non usati, ALT mancante, file grandi, orientamento, data e autore.",
  featBulkLabel: "Azioni di gruppo",
  featBulkDesc: "Seleziona più elementi per aggiungerli a una cartella o eliminarli.",
  featModalLabel: "Selettore nella finestra media",
  featModalDesc: "Cartelle e ricerca nella finestra media di WordPress.",
  featSmartLabel: "Viste intelligenti",
  featSmartDesc: "Salva, rinomina, aggiorna ed elimina le viste filtro nella barra laterale.",
  featAnalysisLabel: "Analisi AI delle immagini",
  featAnalysisDesc: "Analisi visiva che scrive una descrizione e delle etichette. Usa la tua chiave API.",
  featMetaLabel: "Metadati AI",
  featMetaDesc: "Genera titolo, testo ALT, didascalia e descrizione con l’AI.",
  featBulkAltLabel: "ALT di gruppo",
  featBulkAltDesc: "Genera e applica il testo ALT a più elementi, con avanzamento e un riepilogo finale.",
  featMultiLabel: "Metadati multilingua",
  featMultiDesc: "Campi metadati separati per ogni lingua nell’ispettore.",
  featDupLabel: "Rilevamento duplicati",
  featDupDesc: "Trova file identici e quasi duplicati nella libreria.",
  featUnusedLabel: "Media non usati",
  featUnusedDesc: "Trova gli allegati senza riferimenti noti.",
  featUsageLabel: "Utilizzo",
  featUsageDesc: "Cerca dove i media sono usati negli articoli, nei campi personalizzati e nei costruttori di pagine.",
  featHealthLabel: "Salute",
  featHealthDesc: "Punteggi della libreria e un elenco di problemi.",
  featSystemLabel: "Stato del sistema",
  featSystemDesc: "Controlli dell’ambiente, limiti PHP e diagnostica del plugin.",
  featOptimizeLabel: "Ottimizzazione immagini",
  featOptimizeDesc: "Comprimi le immagini, guarda l’anteprima e ripristina da una copia di sicurezza.",
  featEditLabel: "Ritaglia e ruota",
  featEditDesc: "Ritaglia e ruota senza perdere l’originale. Le miniature si rigenerano.",
  featResizeLabel: "Ridimensiona",
  featResizeDesc: "Ridimensiona un’immagine a una larghezza e un’altezza precise. Resta una copia.",
  featConvertLabel: "Conversione di formato",
  featConvertDesc: "Converti tra JPEG, PNG, WebP e AVIF quando il server lo supporta.",
  featRmbgLabel: "Rimuovi sfondo",
  featRmbgDesc: "Rimuovi lo sfondo nel browser e salva un PNG trasparente.",
  featReplaceLabel: "Sostituisci file",
  featReplaceDesc: "Sostituisci il file tenendo lo stesso ID allegato e gli stessi riferimenti.",
  featRenameLabel: "Rinomina file",
  featRenameDesc: "Rinomina il file sul disco, rigenera le dimensioni e aggiorna gli URL in tutto il sito.",
  featAiRenameLabel: "Rinomina con AI al caricamento",
  featAiRenameDesc: "Dopo l’analisi propone un nome file descrittivo e aggiorna i riferimenti. Devi confermare prima che venga applicato.",
  featWhiteLabelLabel: "White label",
  featWhiteLabelDesc: "Sostituisci il logo del plugin e l’icona del menu di WordPress con i tuoi.",
  whiteLabelTitle: "White label",
  whiteLabelHint: "Il logo compare nella libreria. L’icona sostituisce quella del menu di amministrazione di WordPress. PNG, JPEG, WebP o GIF, fino a 2 MB.",
  whiteLabelLogo: "Logo aziendale",
  whiteLabelLogoHint: "Sostituisce il logo nella barra laterale della libreria.",
  whiteLabelIcon: "Icona del menu",
  whiteLabelIconHint: "Sostituisce l’icona nel menu di amministrazione di WordPress. Meglio un’immagine quadrata.",
  whiteLabelUpload: "Carica",
  whiteLabelReplace: "Sostituisci",
  whiteLabelRemove: "Rimuovi",
  whiteLabelSaved: "Immagine del marchio salvata.",
  whiteLabelRemoved: "Immagine del marchio rimossa.",
  whiteLabelUploadFailed: "Impossibile salvare l’immagine del marchio.",
  whiteLabelFileType: "Scegli un’immagine PNG, JPEG, WebP o GIF.",
  whiteLabelTooLarge: "L’immagine è troppo grande. La dimensione massima è 2 MB.",
  rangeOf: "{from}–{to} di {total}",
  pageOf: "Pagina {current} di {total}",
  ringAttachments: "{n} di {m} allegati",
  ringIndexed: "{n} di {m} indicizzati",
  ringUnused: "{n} forse non usati",
  ringMissingAlt: "{n} di {m} immagini senza ALT",
  ringChecks: "{n} di {m} controlli superati",
  inspectorHeading: "Pannello",
  inspectorEmpty: "Seleziona un file per modificarne metadati, dati AI e utilizzi.",
  loadingFileDetails: "Caricamento dettagli del file…",
  foldersVirtualHint: "Solo cartelle virtuali. I file restano nella directory uploads di WordPress.",
  optimizeButton: "Ottimizza al {quality}%",
  cropToolHint: "Regola inquadratura e orientamento. Le modifiche rigenerano le miniature e tengono una copia di sicurezza.",
  resizeCurrent: "Dimensione attuale: {w}×{h} px.",
  convertConfirm: "Convertire questa immagine in {format}?",
  convertReferencesNotice: 'FoldRocket aggiornerà gli URL riconosciuti in articoli, metadati e opzioni. I riferimenti personalizzati o esterni potrebbero richiedere un controllo.',
  removeBgRuns: "Funziona nel browser, senza chiave API. Al primo avvio scarica un modello locale. L’applicazione salva un PNG trasparente e tiene una copia.",
  cropRotateHint: "Ruota a passi di 90° oppure ritaglia l’inquadratura. L’anteprima si aggiorna prima di applicare.",
  missingAttachment: "Allegato mancante.",
  wpSection: "WordPress",
  usesCount: "{count} utilizzi",
  perPageHint: "Numero di elementi mostrati in ogni pagina della libreria. Tra 1 e 100 (predefinito 20).",
  largeFileSettingsHint: "I file da questa dimensione in su sono segnalati come grandi nei filtri della libreria e in Salute (predefinito 2 MB).",
  accentHint: "Colore di accento per pulsanti, anelli di selezione e stati attivi nell’interfaccia della libreria.",
  textGenHint: "Indicazioni facoltative per titoli, testi ALT, didascalie e descrizioni. Valgono quando analizzi o generi con l’AI.",
  modelHint: "Modello visivo per descrizioni, titoli, testi ALT e didascalie.",
  providerUsedFor: "Usato per Analizza con AI e Genera con AI. La chiave è la tua.",
  configuredSuffix: "(configurato)",
  savedSuffix: "(salvata)",
  keepKeyPlaceholder: "Lascia vuoto per tenere la chiave attuale",
  retry: "Riprova",
  relaunchShort: "Rifarai la configurazione. Le impostazioni attuali restano finché non la completi.",
  modalSearchHint: "La finestra media di WordPress include la ricerca di FoldRocket quando inserisci un file.",
  severityWarn: "Avviso",
  severityInfo: "Info",
  severityError: "Errore",
  deleteMedia: "Elimina media",
  assignFolderHint: "Assegna questo elemento a una cartella esistente senza spostare il file sul disco.",
  renameExtHint: "L’estensione resta la stessa. Conferma prima di rinominare il file sul disco.",
  renameMissingExtHint: "Il file fisico è mancante. Inserisci l’estensione del file esistente in questa cartella per ricollegarlo.",
  resizeToolDesc: "Viene conservata una copia dell’originale.",
  convertToolDesc: "Converti tra JPEG, PNG e WebP. L’ID dell’allegato resta lo stesso e viene tenuta una copia.",
  removeBgToolDesc: "Genera un’anteprima del ritaglio nel browser, poi applica un PNG trasparente. Viene tenuta una copia dell’originale.",
  aiIndexHint: "Stato dell’analisi e hash memorizzati da FoldRocket.",
  generatedSizesHint: "Dimensioni intermedie che WordPress ha generato per questo allegato.",
  noExif: "Nessun metadato EXIF trovato per questo file.",
  noExifFormat: "Nessun metadato EXIF trovato per questo file (questo formato di solito ne ha pochi o nessuno).",
  cropRatioHint: "Blocca il riquadro su un rapporto, oppure scegli Libero per trascinarlo liberamente.",
  cropAfterRotate: "Il ritaglio usa l’orientamento originale; la rotazione viene applicata dopo.",
  usesCountOne: "{count} utilizzo",
  statusUnknown: "Sconosciuto",
  statusNone: "Nessuno",
  dupUnique: "Univoco",
  dupExact: "Duplicato esatto",
  dupNear: "Quasi duplicato",
  optOptimized: "Ottimizzato",
  optSkipped: "Saltato",
  optFailed: "Non riuscito",
  confHigh: "Alta",
  confMedium: "Media",
  confLow: "Bassa",
  confUnknown: "Sconosciuta",
  aspectFree: "Libero",
  sessionExpired: "Sessione scaduta. Ricarica la pagina e accedi di nuovo.",
  requestFailed: "Richiesta non riuscita",
  requestFailedHtml: "Richiesta non riuscita (HTTP {status}). Il server ha restituito HTML invece di JSON.",
  requestFailedHttp: "Richiesta non riuscita (HTTP {status}).",
  aiQueueFailed: "Impossibile accodare la generazione AI. Riprova.",
  jobRunnerTimeout: "Il processo in background è scaduto.",
  altPreviewTimeout: "L’anteprima ALT è scaduta. Prova con meno elementi o controlla il provider AI.",
  uploadNetworkError: "Errore di rete durante il caricamento. Controlla la connessione e riprova.",
  optimizePreviewTimeout: "L’anteprima di ottimizzazione è scaduta. Riprova.",
  optimizeTimeout: "L’ottimizzazione è scaduta. Riprova o usa un’immagine più piccola.",
  restoreTimeout: "Il ripristino è scaduto. Riprova o controlla il server.",
  removeBgNetworkError: "Errore di rete durante la rimozione dello sfondo. Controlla la connessione e riprova.",
  replaceNetworkError: "Errore di rete durante la sostituzione del file. Controlla la connessione e riprova.",
  suggestNameFailed: "Impossibile suggerire un nome file. Riprova.",
  providerTestTimeout: "Il test del provider è scaduto. Controlla la rete e la chiave API.",
  licenseTimeout: "La verifica della licenza è scaduta. Riprova.",
  bgLibLoadFailed: "Impossibile caricare la libreria per la rimozione dello sfondo.",
  uploadItemFailed: "non riuscito",
  mediaTabPlaceholder: "FoldRocket",
  contextMenuLabel: "Azioni per {name}",
  openDetails: "Apri dettagli",
  copyFilename: "Copia nome file",
  toastFilenameCopied: "Nome file copiato negli appunti.",
  toastFilenameCopyFailed: "Impossibile copiare il nome file.",
};

export const CATALOGS: Partial<Record<UiLocale, Catalog>> = {
  en_US: en,
  it_IT: it,
};

/** Load only the locale group needed by the current admin session. */
export async function loadLocaleCatalog(locale: UiLocale): Promise<void> {
  if (CATALOGS[locale]) return;
  if (['fr_FR', 'de_DE', 'es_ES', 'pt_PT'].includes(locale)) {
    const module = await import('./ui-catalogs');
    const group: Partial<Record<UiLocale, Catalog>> = { fr_FR: module.fr, de_DE: module.de, es_ES: module.es, pt_PT: module.pt };
    const selected = group[locale];
    CATALOGS[locale] = { ...en, ...selected };
    return;
  }
  const module = await import('./ui-catalogs-more');
  const group: Partial<Record<UiLocale, Catalog>> = {
    da_DK: module.da,
    nl_NL: module.nl,
    pl_PL: module.pl,
    pt_BR: module.ptBR,
    ru_RU: module.ru,
  };
  const selected = group[locale];
  CATALOGS[locale] = { ...en, ...selected };
}

export const UI_LOCALE_OPTIONS: Array<{ code: UiLocale | 'auto'; label: string }> = [
  { code: 'auto', label: 'Match WordPress' },
  { code: 'en_US', label: 'English' },
  { code: 'it_IT', label: 'Italiano' },
  { code: 'fr_FR', label: 'Français' },
  { code: 'de_DE', label: 'Deutsch' },
  { code: 'es_ES', label: 'Español' },
  { code: 'pt_PT', label: 'Português (Portugal)' },
  { code: 'pt_BR', label: 'Português (Brasil)' },
  { code: 'pl_PL', label: 'Polski' },
  { code: 'ru_RU', label: 'Русский' },
  { code: 'da_DK', label: 'Dansk' },
  { code: 'nl_NL', label: 'Nederlands' },
];

const UI_LOCALE_SET = new Set<UiLocale>([
  'en_US',
  'it_IT',
  'fr_FR',
  'de_DE',
  'es_ES',
  'pt_PT',
  'pt_BR',
  'pl_PL',
  'ru_RU',
  'da_DK',
  'nl_NL',
]);

export function normalizeUiLocale(code: string | undefined | null): UiLocale {
  if (!code) return 'en_US';
  const normalized = code.replace('-', '_');
  if (UI_LOCALE_SET.has(normalized as UiLocale)) return normalized as UiLocale;
  const lower = normalized.toLowerCase();
  if (lower === 'pt_br' || lower.startsWith('pt_br')) return 'pt_BR';
  const prefix = lower.slice(0, 2);
  if (prefix === 'it') return 'it_IT';
  if (prefix === 'fr') return 'fr_FR';
  if (prefix === 'de') return 'de_DE';
  if (prefix === 'es') return 'es_ES';
  if (prefix === 'pl') return 'pl_PL';
  if (prefix === 'ru') return 'ru_RU';
  if (prefix === 'da') return 'da_DK';
  if (prefix === 'nl') return 'nl_NL';
  if (prefix === 'pt') return 'pt_PT';
  if (prefix === 'en') return 'en_US';
  return 'en_US';
}

export function resolveUiLocale(
  setting: string | undefined | null,
  wpLocale?: string | null
): UiLocale {
  if (!setting || setting === 'auto') {
    return normalizeUiLocale(wpLocale || undefined);
  }
  return normalizeUiLocale(setting);
}

export function getCatalog(locale: UiLocale): Catalog {
  return CATALOGS[locale] || CATALOGS.en_US || en;
}

export function translate(
  locale: UiLocale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  let text = getCatalog(locale)[key] || CATALOGS.en_US?.[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

/** Sync FRKT_BOOT.i18n keys used across pages. */
export function applyBootI18n(locale: UiLocale): void {
  if (!window.FRKT_BOOT) return;
  const c = getCatalog(locale);
  window.FRKT_BOOT.uiLocale = locale;
  window.FRKT_BOOT.i18n = {
    ...window.FRKT_BOOT.i18n,
    title: c.title || en.title!,
    library: c.library || en.library!,
    duplicates: c.duplicates || en.duplicates!,
    health: c.health || en.health!,
    settings: c.settings || en.settings!,
    features: c.features || en.features!,
    search: c.search || en.search!,
    newFolder: c.newFolder || en.newFolder!,
    upload: c.upload || en.upload!,
    uploading: c.uploading || en.uploading!,
    analyze: c.analyze || en.analyze!,
    generateWithAi: c.generateWithAi || en.generateWithAi!,
    generateAllData: c.generateAllData || en.generateAllData!,
    empty: c.empty || en.empty!,
    loading: c.loading || en.loading!,
    error: c.error || en.error!,
  };
}
