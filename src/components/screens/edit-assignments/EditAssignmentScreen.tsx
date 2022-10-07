import React, { useRef, useState } from 'react';
import { trpc } from '../../../utils/trpc';
import { Button, Variant } from '../../common/Button/Button';
import { EmptyStateWrapper } from '../../common/EmptyStateWrapper';
import { MainHeading } from '../../common/MainHeading';
import { AttachmentsTable } from './AttachmentsTable';
import { EmptyStateAttachments } from './EmptyStateAttachments';
import { DateTime } from 'luxon';
import { Badge, BadgeVariant } from '../../common/Badge';
import { useForm } from 'react-hook-form';
import { PencilSquare } from '../../common/Icons/PencilSquare';
import { LinkButton, LinkButtonVariant } from '../../common/Button/LinkButton';
import { useToggle } from 'react-use';
import { UploadIcon } from '../../common/Icons/UploadIcon';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/router';
import { TrashIcon } from '../../common/Icons/TrashIcon';
import { FormGroup } from '../../common/Form/FormGroup/FormGroup';
import { EditDateModal } from './EditDateModal';

type UpdateDescriptionForm = {
  description: string;
};

type UpdateTitleForm = {
  title: string;
};

export const EditAssignmentScreen = ({ classroomId, assignmentId }) => {
  const [file, setFile] = useState<File>();
  const [isEditingDescription, toggleIsEditingDescription] = useToggle(false);
  const [isEditingTitle, toggleIsEditingTitle] = useToggle(false);
  const [isEditDueDateModalOpen, toggleIsEditDueDateModalOpen] =
    useToggle(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, setValue } = useForm<UpdateDescriptionForm>();
  const {
    register: registerTitle,
    handleSubmit: handleSubmitTitle,
    setValue: setValueTitle,
  } = useForm<UpdateTitleForm>();
  const router = useRouter();

  const { mutateAsync: createPresignedUrl } = trpc.useMutation(
    'assignment.createPresignedUrl'
  );

  const { mutateAsync: deleteAssignment } = trpc.useMutation(
    'assignment.deleteAssignment'
  );

  const { mutateAsync: updateDescription } = trpc.useMutation(
    'assignment.updateDescription'
  );

  const { mutateAsync: updateTitle } = trpc.useMutation(
    'assignment.updateTitle'
  );

  const attachments = trpc.useQuery([
    'assignment.getAttachments',
    {
      assignmentId,
    },
  ]);

  const assignment = trpc.useQuery(
    [
      'classroom.getAssignment',
      {
        assignmentId,
      },
    ],
    {
      refetchOnWindowFocus: false,
      onSuccess(data) {
        setValue('description', data?.description ?? '');
        setValueTitle('title', data?.name ?? '');
      },
    }
  );

  const onFileChange = (e: React.FormEvent<HTMLInputElement>) => {
    setFile(e.currentTarget.files?.[0]);
  };

  const uploadImage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    const { url, fields }: { url: string; fields: any } =
      (await createPresignedUrl({
        filename: file.name,
        assignmentId,
      })) as any;
    const data = {
      ...fields,
      'Content-Type': file.type,
      file,
    };
    const formData = new FormData();
    for (const name in data) {
      formData.append(name, data[name]);
    }
    await fetch(url, {
      method: 'POST',
      body: formData,
    });
    setFile(undefined);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
    attachments.refetch();
  };

  const handleSaveEditDescription = async (formData: UpdateDescriptionForm) => {
    await updateDescription({
      description: formData.description,
      assignmentId,
    });
    assignment.refetch();
    toggleIsEditingDescription();
  };

  const handleSaveEditTitle = async (formData: UpdateTitleForm) => {
    await updateTitle({
      title: formData.title,
      assignmentId,
    });
    assignment.refetch();
    toggleIsEditingTitle();
  };

  const handleDeleteAssignment = async () => {
    if (!confirm('are you sure?')) return;
    await deleteAssignment({ assignmentId });
    router.push(`/classrooms/${classroomId}`);
  };

  const handleOnAttachmentDelete = () => {
    attachments.refetch();
  };

  const formattedDueDate = assignment.data?.dueDate
    ? DateTime.fromISO(assignment.data?.dueDate).toLocaleString(
        DateTime.DATE_MED
      )
    : 'N/A';

  return (
    <>
      <MainHeading title={`Edit Assignment`}>
        <Badge
          variant={BadgeVariant.Error}
          className="flex gap-4 items-center"
        >
          Due on {formattedDueDate}
          <LinkButton
            onClick={toggleIsEditDueDateModalOpen}
            variant={LinkButtonVariant.Secondary}
          >
            <PencilSquare /> Edit
          </LinkButton>
        </Badge>

        <LinkButton
          variant={LinkButtonVariant.Danger}
          onClick={handleDeleteAssignment}
        >
          <TrashIcon /> Delete
        </LinkButton>
      </MainHeading>

      <section>
        <h2 className="text-4xl mb-4 flex gap-4 items-center">
          Title
          <LinkButton onClick={toggleIsEditingTitle}>
            <PencilSquare /> Edit
          </LinkButton>
        </h2>
        {isEditingTitle ? (
          <form
            className="w-2/3 flex flex-col mb-12"
            onSubmit={handleSubmitTitle(handleSaveEditTitle)}
          >
            <FormGroup
              label="Title"
              name="title"
            >
              <input
                className="mb-4"
                {...registerTitle('title')}
              ></input>
            </FormGroup>

            <div className="flex justify-end">
              <Button className="w-fit">
                <UploadIcon size="md" /> Save
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-md mb-12 flex gap-4 items-center">
            {assignment.data?.name}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-3xl mb-4 flex">
          Description
          <LinkButton onClick={toggleIsEditingDescription}>
            <PencilSquare /> Edit
          </LinkButton>
        </h2>

        {isEditingDescription ? (
          <form
            className="w-2/3 flex flex-col mb-12"
            onSubmit={handleSubmit(handleSaveEditDescription)}
          >
            <FormGroup
              label="Description"
              name="description"
            >
              <textarea
                className="mb-4 h-56"
                {...register('description')}
              ></textarea>
            </FormGroup>

            <div className="flex justify-end">
              <Button className="w-fit">
                <UploadIcon size="md" /> Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="markdown mb-12">
            <ReactMarkdown>{assignment.data?.description ?? ''}</ReactMarkdown>
          </div>
        )}

        <h2 className="text-3xl mb-4">Attachments</h2>

        <div className="mb-8">
          <EmptyStateWrapper
            EmptyComponent={<EmptyStateAttachments />}
            NonEmptyComponent={
              <AttachmentsTable
                onAttachmentDeleted={handleOnAttachmentDelete}
                attachments={attachments.data ?? []}
              />
            }
            isLoading={attachments.isLoading}
            data={attachments.data}
          />
        </div>

        <div className="flex justify-end">
          <form
            className="text-white"
            onSubmit={uploadImage}
          >
            <label htmlFor="file-upload">Upload Attachment</label>
            <input
              ref={fileRef}
              id="file-upload"
              className="ml-4 text-white"
              onChange={onFileChange}
              type="file"
            ></input>
            {file && (
              <Button
                className="ml-4"
                type="submit"
                variant={Variant.Primary}
              >
                Upload
              </Button>
            )}
          </form>
        </div>
      </section>

      {assignment.data?.dueDate && (
        <EditDateModal
          initialDueDate={assignment.data.dueDate}
          assignmentId={assignmentId}
          isOpen={isEditDueDateModalOpen}
          onCancel={toggleIsEditDueDateModalOpen}
          onComplete={() => {
            toggleIsEditDueDateModalOpen();
            assignment.refetch();
          }}
        />
      )}
    </>
  );
};
